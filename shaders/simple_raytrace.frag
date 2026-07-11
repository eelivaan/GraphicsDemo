#version 460

uniform float time;

in vec2 normalized_coords;

out vec4 fragColor;

// Calcs intersection and exit distances, and normal at intersection.
// The ray must be in box/object space. If you have multiple boxes all
// aligned to the same axis, you can precompute 1/rd. If you have
// multiple boxes but they are not alligned to each other, use the 
// "Generic" box intersector bellow this one.
vec2 boxIntersection( in vec3 ro, in vec3 rd, in vec3 rad, out vec3 oN ) 
{
    vec3 m = 1.0/rd;
    vec3 n = m*ro;
    vec3 k = abs(m)*rad;
    vec3 t1 = -n - k;
    vec3 t2 = -n + k;

    float tN = max( max( t1.x, t1.y ), t1.z );
    float tF = min( min( t2.x, t2.y ), t2.z );
	
    if( tN>tF || tF<0.0) return vec2(-1.0); // no intersection
    
    oN = -sign(rd)*step(t1.yzx,t1.xyz)*step(t1.zxy,t1.xyz);

    return vec2( tN, tF );
}

float filteredCheckers( in vec2 p, in vec2 dpdx, in vec2 dpdy )
{
    vec2 w = max(abs(dpdx), abs(dpdy));
    vec2 i = 2.0*(abs(fract((p-0.5*w)*0.5)-0.5)-
                  abs(fract((p+0.5*w)*0.5)-0.5))/w;
    return 0.5 - 0.5*i.x*i.y;                  
}

struct FHitInfo {
    vec3 hitLocation;
    vec3 hitNormal;
    vec3 baseColor;
    vec3 emissiveColor;
    float roughness;
    float metallic;
};

bool TraceRay(in vec3 rayorigin, in vec3 raydirection, out FHitInfo hitInfo)
{
    bool wasHit = false;
    hitInfo.metallic = 0.0;

    // ground plane
    float hitD = (rayorigin.z - -1.5) / dot(-raydirection, vec3(0,0,1));
    if (hitD > 0.0)
    {
        wasHit = true;
        hitInfo.hitLocation = rayorigin + raydirection * hitD;
        hitInfo.hitNormal = vec3(0,0,1);
        vec2 uv = hitInfo.hitLocation.xy * 1.5;
        float checker = mix(filteredCheckers(uv, dFdx(uv), dFdy(uv)), 0.5, min(1.0, hitD / 30.0));
        hitInfo.baseColor = vec3(0.1 + 0.3 * checker);
        hitInfo.roughness = 0.5;
    }

    // box
    vec3 hitNormaltemp;
    hitD = boxIntersection(rayorigin, raydirection, vec3(1,1,1), hitNormaltemp).x;
    if (hitD > 0.0)
    {
        wasHit = true;
        hitInfo.hitLocation = rayorigin + raydirection * hitD;
        hitInfo.hitNormal = hitNormaltemp;

        // project onto normal plane
        //vec3 hitProj = hitLocation - dot(hitLocation, hitNormal) / dot(hitNormal, hitNormal) * hitNormal;

        //vec3 q = floor(hitLocation);
        //float checker = mod(q.x + q.y + q.z, 2.0);
        hitInfo.baseColor = vec3(0.9, 0.5, 0.5);
        hitInfo.roughness = 1.0;
        hitInfo.metallic = 0.0;
    }

    return wasHit;
}

// PBR functions
const float PI = 3.14159265359;

float DistributionGGX(vec3 N, vec3 H, float roughness)
{
    float a      = roughness*roughness;
    float a2     = a*a;
    float NdotH  = max(dot(N, H), 0.0);
    float NdotH2 = NdotH*NdotH;
	
    float num   = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;
	
    return num / denom;
}

float GeometrySchlickGGX(float NdotV, float roughness)
{
    float r = (roughness + 1.0);
    float k = (r*r) / 8.0;

    float num   = NdotV;
    float denom = NdotV * (1.0 - k) + k;
	
    return num / denom;
}
float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness)
{
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2  = GeometrySchlickGGX(NdotV, roughness);
    float ggx1  = GeometrySchlickGGX(NdotL, roughness);
	
    return ggx1 * ggx2;
}

vec3 fresnelSchlick(float cosTheta, vec3 F0)
{
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// bidirectional reflective distribution function 
vec3 BRDF(vec3 p, vec3 Wi, vec3 Wo, FHitInfo material)
{
    vec3 N = material.hitNormal;
    vec3 H = normalize(Wi + Wo);
    vec3 albedo = material.baseColor;

    float NDF = DistributionGGX(N, H, material.roughness);       
    float G   = GeometrySmith(N, Wo, Wi, material.roughness);   
    
    vec3 F0 = vec3(0.04); 
    F0      = mix(F0, albedo, material.metallic);
    vec3 F  = fresnelSchlick(max(dot(H, Wo), 0.0), F0);

    vec3 numerator    = NDF * G * F;
    float denominator = 4.0 * max(dot(N, Wo), 0.0) * max(dot(N, Wi), 0.0)  + 0.0001;
    vec3 specular     = numerator / denominator;  

    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - material.metallic;	
      
    return (kD * albedo / PI + specular);
}

vec3 ambient(vec3 Wi)
{
    //vec3 sundir = normalize(vec3(1,1,1));
    //vec3 ambient = mix(vec3(0.02, 0.1, 0.2), vec3(24.0), smoothstep(0.99, 0.995, dot(Wi,sundir)));

    return vec3(0.1, 0.4, 0.6);
}

// radiance from point p and given direction w
vec3 L(vec3 p, vec3 Wi)
{
    FHitInfo hitInfo;
    if (TraceRay(p + Wi*0.001, Wi, hitInfo))
    {
        return vec3(0.0);
    }
    return vec3(2.0);
}

void main()
{
    vec3 camera_pos = vec3(-5 * cos(time*0.5), 5 * sin(time*0.5), 1.2);
    vec3 camera_dir = normalize(vec3(0,0,0) - camera_pos);
    vec3 camera_right = cross(vec3(0,0,1), camera_dir);
    vec3 camera_up = cross(camera_dir, camera_right);

    const vec3 raydirection = normalize(camera_dir + normalized_coords.x * camera_right + normalized_coords.y * camera_up);
    const vec3 rayorigin = camera_pos;
    const vec3 lightdirection = normalize(vec3(1,0.2,0.5));

    vec3 HDRcolor = ambient(raydirection);

    FHitInfo hitInfo;

    if (TraceRay(rayorigin, raydirection, hitInfo))
    {
        // phong shading
        //HDRcolor = ambient * hitInfo.baseColor
        //            + max(0.0, dot(hitInfo.hitNormal, lightdirection)) * hitInfo.baseColor;

        // PBR render equation
        vec3 p = hitInfo.hitLocation;
        vec3 Wo = -raydirection;  // view direction
#if 1
        vec3 Wi = lightdirection;
        HDRcolor = BRDF(p, Wi, Wo, hitInfo) * ambient(hitInfo.hitNormal)
                   + BRDF(p, Wi, Wo, hitInfo) * L(p, Wi) * max(0.0, dot(hitInfo.hitNormal, Wi));        
#else
        HDRcolor = vec3(0.0);
        uint num_samples = 0;
        for (float e0 = 0.0; e0 < 1.0; e0 += 0.02)
        for (float e1 = 0.0; e1 < 1.0; e1 += 0.02)
        {
            float theta = acos(e0);
            float phi = 2.0 * PI * e1;
            vec3 hemisphere = vec3(cos(phi) * sin(theta), sin(phi) * sin(theta), cos(theta));
            vec3 N = hitInfo.hitNormal;
            vec3 T = (abs(N.z) > 0.99) ? cross(N, vec3(1,0,0)) : cross(N, vec3(0,0,1));
            vec3 B = cross(N, T);
            vec3 Wi = normalize(N * hemisphere.z + T * hemisphere.x + B * hemisphere.y);
            //HDRcolor += hitInfo.baseColor * L(p, Wi) * max(0.0, dot(hitInfo.hitNormal, Wi));
            HDRcolor += BRDF(p, Wi, Wo, hitInfo) * L(p, Wi) * max(0.0, dot(hitInfo.hitNormal, Wi));
            num_samples++;
        }
        HDRcolor /= float(num_samples);
#endif
    }

    // gamma correction
    fragColor = vec4(pow(HDRcolor, vec3(1.0/2.2)), 1.0);
    //fragColor = vec4(0.5 + 0.5 * out_norm, 0.0, 1.0);
}