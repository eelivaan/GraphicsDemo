//#version 460

const float PI = 3.14159265359;
const float eps = 0.001;

//------------------------------------------------------------------
// oldschool rand() from Visual Studio
//------------------------------------------------------------------
int   seed = 1;
int   rand(void) { seed = seed*0x343fd+0x269ec3; return (seed>>16)&32767; }
float frand(void) { return float(rand())/32767.0; }
void  srand( ivec2 p, int frame )
{
    int n = frame;
    n = (n<<13)^n; n=n*(n*n*15731+789221)+1376312589; // by Hugo Elias
    n += p.y;
    n = (n<<13)^n; n=n*(n*n*15731+789221)+1376312589;
    n += p.x;
    n = (n<<13)^n; n=n*(n*n*15731+789221)+1376312589;
    seed = n;
}


#if 0

layout (binding=0) uniform atomic_uint counter;

/**
 * http://amindforeverprogramming.blogspot.de/2013/07/random-floats-in-glsl-330.html
 */
uint hash(uint x) {
  x += x << 10u;
  x ^= x >> 6u;
  x += x << 3u;
  x ^= x >> 11u;
  x += x << 15u;
  return x;
}

/**
 * Generate a random value in [-1..+1) using an atomic counter.
 * 
 * @see random.glsl 
 */
float random()
{
  const uint mantissaMask = 0x007FFFFFu;
  const uint one = 0x3F800000u;
  uint h = hash(atomicCounterIncrement(counter));
  //uint h = hash(cnt);
  h &= mantissaMask;
  h |= one;
  float r2 = uintBitsToFloat(h);
  return (r2 - 1.0) * 2.0 - 1.0;
}

vec3 randomSpherePoint(vec3 rand) {
  float ang1 = (rand.x + 1.0) * PI; // [-1..1) -> [0..2*PI)
  float u = rand.y; // [-1..1), cos and acos(2v-1) cancel each other out, so we arrive at [-1..1)
  float u2 = u * u;
  float sqrt1MinusU2 = sqrt(1.0 - u2);
  float x = sqrt1MinusU2 * cos(ang1);
  float y = sqrt1MinusU2 * sin(ang1);
  float z = u;
  return vec3(x, y, z);
}

/**
 * Generate a uniformly distributed random point on the unit-hemisphere
 * around the given normal vector.
 * 
 * This function can be used to generate reflected rays for diffuse surfaces.
 * Actually, this function can be used to sample reflected rays for ANY surface
 * with an arbitrary BRDF correctly.
 * This is because we always need to solve the integral over the hemisphere of
 * a surface point by using numerical approximation using a sum of many
 * sample directions.
 * It is only with non-lambertian BRDF's that, in theory, we could sample them more
 * efficiently, if we knew in which direction the BRDF reflects the most energy.
 * This would be importance sampling, but care must be taken as to not over-estimate
 * those surfaces, because then our sum for the integral would be greater than the
 * integral itself. This is the inherent problem with importance sampling.
 * 
 * The points are uniform over the sphere and NOT over the projected disk
 * of the sphere, so this function cannot be used when sampling a spherical
 * light, where we need to sample the projected surface of the light (i.e. disk)!
 */
vec3 randomHemispherePoint(vec3 rand, vec3 n) {
  /**
   * Generate random sphere point and swap vector along the normal, if it
   * points to the wrong of the two hemispheres.
   * This method provides a uniform distribution over the hemisphere, 
   * provided that the sphere distribution is also uniform.
   */
  vec3 v = randomSpherePoint(rand);
  return v * sign(dot(v, n));
}

vec3 randomCosineWeightedHemispherePoint(vec3 rand, vec3 n)
{
  float r = rand.x * 0.5 + 0.5; // [-1..1) -> [0..1)
  float angle = (rand.y + 1.0) * PI; // [-1..1] -> [0..2*PI)
  float sr = sqrt(r);
  vec2 p = vec2(sr * cos(angle), sr * sin(angle));
  /*
   * Unproject disk point up onto hemisphere:
   * 1.0 == sqrt(x*x + y*y + z*z) -> z = sqrt(1.0 - x*x - y*y)
   */
  vec3 ph = vec3(p.xy, sqrt(1.0 - p*p));
  /*
   * Compute some arbitrary tangent space for orienting
   * our hemisphere 'ph' around the normal. We use the camera's up vector
   * to have some fix reference vector over the whole screen.
   */
  vec3 tangent = normalize(rand);
  vec3 bitangent = cross(tangent, n);
  tangent = cross(bitangent, n);
  
  /* Make our hemisphere orient around the normal. */
  return tangent * ph.x + bitangent * ph.y + n * ph.z;
}
#endif
