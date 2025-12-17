// Highly inspired by https://learnopengl.com/PBR/Theory

struct FMaterial
{
    vec3 baseColor;
    vec3 emissiveColor;
    float roughness;
    float metallic;
};

float DistributionGGX(vec3 N, vec3 H, float roughness)
{
    const float PI = 3.14159265359;
    float a      = roughness;//*roughness;
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

    // for IBL:
    //float k = roughness*roughness / 2.0;

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

vec3 fresnelSchlick(float cosTheta, vec3 F0, float roughness)
{
    //return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// bidirectional reflective distribution function 
vec3 BRDF(vec3 point, vec3 Wi, vec3 Wo, vec3 normal, FMaterial material)
{
    const float PI = 3.14159265359;
    vec3 H = normalize(Wi + Wo);  // halfway
    vec3 albedo = material.baseColor;

    float NDF = DistributionGGX(normal, H, material.roughness);       
    float G   = GeometrySmith(normal, Wo, Wi, material.roughness);   
    
    vec3 F0 = vec3(0.04); 
    F0      = mix(F0, albedo, material.metallic);
    vec3 F  = fresnelSchlick(max(dot(H, Wo), 0.0), F0, material.roughness);
    //vec3 F  = fresnelSchlick(max(dot(normal, Wo), 0.0), F0, material.roughness);

    vec3 numerator    = NDF * G * F;
    float denominator = 4.0 * max(dot(normal, Wo), 0.0) * max(dot(normal, Wi), 0.0) + 0.0001;
    vec3 specular     = numerator / denominator;

    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - material.metallic;	
    
    vec3 result = (kD * albedo / PI + specular);

    // force energy conservation
    result = clamp(result, vec3(0.0), vec3(1.0));
    return result;
}



vec3 ImportanceSampleGGX(vec2 Xi, vec3 N, float roughness)
{
    float a = roughness*roughness;
	
    //Xi = 0.5 + 0.5*Xi; // [0 1]?
    float phi = 2.0 * PI * Xi.x;
    float cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a*a - 1.0) * Xi.y));
    float sinTheta = sqrt(1.0 - cosTheta*cosTheta);
	
    // from spherical coordinates to cartesian coordinates
    vec3 H;
    H.x = cos(phi) * sinTheta;
    H.y = sin(phi) * sinTheta;
    H.z = cosTheta;
	
    // from tangent-space vector to world-space sample vector
    vec3 up        = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangent   = normalize(cross(up, N));
    vec3 bitangent = cross(N, tangent);
	
    vec3 sampleVec = tangent * H.x + bitangent * H.y + N * H.z;
    return normalize(sampleVec);
} 
