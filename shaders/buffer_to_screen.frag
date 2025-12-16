#version 460

in vec2 normalized_coords;

out vec4 fragColor;

uniform sampler2D Buffer;
uniform int Resolution;

void main()
{
    vec2 uv = (0.5 + 0.5 * normalized_coords.xy);
    //fragColor = texture(Buffer, uv);
    fragColor = texelFetch(Buffer, ivec2(uv*Resolution), 0).rgba;
}