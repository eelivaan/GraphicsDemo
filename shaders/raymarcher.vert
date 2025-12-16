#version 460

in vec2 in_vert;

out vec2 normalized_coords;

void main()
{
    gl_Position = vec4(in_vert, 0.0, 1.0);
    normalized_coords = in_vert.xy;
}
