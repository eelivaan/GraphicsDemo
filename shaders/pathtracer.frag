//#version 460

// include "random.glsl"
// include "shapes.glsl"
// include "PBR.glsl"

struct FHitInfo {
    vec3 hitLocation;
    vec3 hitNormal;
    FMaterial material;
};

bool TraceRay(in vec3 rayorigin, in vec3 raydirection, out FHitInfo hitInfo)
{
    bool wasHit = false;
    FMaterial material;
    material.metallic = 0.0;
    material.emissiveColor = vec3(0.0);

    // ground plane
    float hitD = (rayorigin.z - -1.5) / dot(-raydirection, vec3(0,0,1));
    if (hitD > 0.0)
    {
        wasHit = true;
        hitInfo.hitLocation = rayorigin + raydirection * hitD;
        hitInfo.hitNormal = vec3(0,0,1);
        vec2 uv = hitInfo.hitLocation.xy * 1.5;
        vec2 q = floor(uv);
        float checker = mod(q.x + q.y, 2.0);
        material.baseColor = vec3(0.2 + 0.4 * checker);// * filteredCheckers(uv, dFdx(uv), dFdy(uv)));
        //hitInfo.baseColor = vec3(0.1 + 0.3 * filteredCheckers(uv, vec2(0.01), vec2(0.01)));
        material.roughness = 0.9;
        material.metallic = 0.0;
    }

    // shapes
    float closestHit = (hitD > 0.0) ? hitD : 100000.0;
    
    for (int shape = 0; shape < 3; shape++)
    {
        vec3 hitNormaltemp;
        if (shape == 0)
            hitD = boxIntersection(rayorigin, raydirection, vec3(2,1.5,1), hitNormaltemp).x;
        else if (shape == 1)
            hitD = sphIntersect(rayorigin, raydirection, vec3(0,0,3.1), 1.5, hitNormaltemp).x;
        else if (shape == 2)
            hitD = sphIntersect(rayorigin, raydirection, vec3(-8,0,0.9), 3.0, hitNormaltemp).x;

        if (hitD > 0.0 && hitD < closestHit)
        {
            wasHit = true;
            closestHit = hitD;
            hitInfo.hitLocation = rayorigin + raydirection * hitD;
            hitInfo.hitNormal = hitNormaltemp;

            if (shape == 0) {
                vec3 q = floor(hitInfo.hitLocation * 2.0);
                float checker = mod(q.x + q.y + q.z, 2.0);
                material.baseColor = vec3(0.9 * checker, 0.2, 0.2);
                material.roughness = 0.2;
                material.metallic = 1.0;
            } else if (shape == 1) {
                material.baseColor = vec3(0.1, 0.7, 0.2);
                material.roughness = 0.3;
            } else if (shape == 2) {
                material.baseColor = vec3(0.1);
                material.emissiveColor = vec3(5.0, 1.0, 5.0);
                material.roughness = 1.0;
                material.metallic = 1.0;
            }
        }
    }

    hitInfo.material = material;
    return wasHit;
}

const vec3 sundir = normalize(vec3(1.0,0.5,0.4));

vec3 sky(vec3 raydirection)
{
    //return vec3(0.0, 0.01, 0.02);

    vec3 blue = 0.3 * vec3(0.1, 0.5, 0.9) * step(0.0, dot(raydirection, vec3(0,0,1)));
    vec3 sun = vec3(1500.0);
    return mix(blue, sun, smoothstep(0.992, 0.993, dot(raydirection, sundir)));
}

const int max_iterations = 5;
const int paths_per_iteration = 100;

uniform int num_steps;
uniform int iteration;

in vec2 normalized_coords;

out vec4 fragColor;


void main()
{
    vec3 camera_pos = vec3(5, -5, 1.9);
    vec3 camera_dir = normalize(vec3(0,0,0) - camera_pos);
    vec3 camera_right = cross(vec3(0,0,1), camera_dir);
    vec3 camera_up = cross(camera_dir, camera_right);

    vec3 finalColor = vec3(0.0);
    const float dS = 1.0 / float(paths_per_iteration);

    for (int path=0; path<paths_per_iteration; path++)
    {
        srand(ivec2(gl_FragCoord.xy), iteration * paths_per_iteration + path);

        vec3 rayorigin = camera_pos;
        // jitter camera ray to get antialiasing and denoising
        const vec2 norm = normalized_coords.xy + vec2(frand(), frand()) * 0.005;
        vec3 raydirection = normalize(camera_dir + norm.x * camera_right + norm.y * camera_up);

        // iteratively trace one light path
        // (it will be temporally and additively blended to other paths)
        vec3 ambientColor = vec3(0.0);
        vec3 emissiveColor = vec3(0.0);
        vec3 albedoProduct = vec3(1.0);

        for (int i=0; i<max_iterations; i++)
        {
            FHitInfo hitResult;
            if (TraceRay(rayorigin, raydirection, hitResult))
            {
                const vec3 p = hitResult.hitLocation;
                const vec3 Wo = -raydirection;
                const vec3 N = hitResult.hitNormal;

                //vec3 rand = vec3(frand(), frand(), frand());
                // = normalize(randomCosineWeightedHemispherePoint(rand, hitResult.hitNormal));
                vec2 rand = vec2(frand(), frand());
                vec3 specularLobe = normalize(mix(reflect(raydirection, N), N, hitResult.material.roughness));

                const vec3 Wi = normalize(ImportanceSampleGGX(rand.xy, specularLobe, hitResult.material.roughness));

                emissiveColor += albedoProduct * hitResult.material.emissiveColor * max(0.0, dot(N, Wo));
                albedoProduct *= BRDF(p, Wi, Wo, N, hitResult.material) * max(0.0, dot(N, Wi));

                rayorigin = hitResult.hitLocation + hitResult.hitNormal * eps;
                raydirection = Wi;
            }
            else
            {
                ambientColor = sky(raydirection);
                break;
            }
        }

        // color = BRDF() * L()
        finalColor += (albedoProduct * ambientColor + emissiveColor) * dS;
    }
    
    // gamma correction and output
    fragColor = vec4(pow(finalColor, vec3(1.0/2.2)) / float(num_steps), 1.0);
    //fragColor = vec4(finalColor / float(num_steps), 1.0);
}
