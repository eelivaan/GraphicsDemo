#version 460

in vec2 normalized_coords;

out vec4 fragColor;

uniform sampler2D Buffer;
uniform int Resolution;

#define ALIVE 1
#define DEAD 0

int read_state(ivec2 cell)
{
    if (cell.x < 0 || cell.y < 0 || cell.x >= Resolution || cell.y >= Resolution) return 0;
    return (texelFetch(Buffer, cell, 0).r > 0.5) ? ALIVE : DEAD;
}

void output_state(int state)
{
    if (state == ALIVE)
        fragColor = vec4(1,0,0,0);
    else if (state == DEAD)
        fragColor = vec4(0,0,0,0);
}


void GameOfLife(ivec2 crnt)
{
    // Conway's Game of Life
    int state = read_state(crnt);

    int num_alive = read_state(crnt + ivec2(-1,-1)) + read_state(crnt + ivec2(0,-1)) + read_state(crnt + ivec2(1,-1))
                  + read_state(crnt + ivec2(-1, 0)) +                                  read_state(crnt + ivec2(1, 0))
                  + read_state(crnt + ivec2(-1, 1)) + read_state(crnt + ivec2(0, 1)) + read_state(crnt + ivec2(1, 1));

    if (state == ALIVE)
        output_state( (num_alive == 2 || num_alive == 3) ? ALIVE : DEAD );
    else if (state == DEAD)
        output_state( (num_alive == 3) ? ALIVE : DEAD );
}


void fungi(ivec2 current_cell)
{
    int state = read_state(current_cell);
    int num_alive = 0;

    // scan surroundings
    for (int y=-1; y<=1; y++)
    for (int x=-1; x<=1; x++)
    {
        if (y == 0 && x == 0) continue;

        if (read_state(current_cell + ivec2(x,y)) == ALIVE)
        {
            num_alive++;
        }
    }

    if (state == ALIVE)
        output_state( (num_alive == 2 || num_alive == 3) ? ALIVE : ALIVE );
    else if (state == DEAD)
        output_state( (num_alive == 3) ? ALIVE : DEAD );
}


void main()
{
    ivec2 current_cell = ivec2(gl_FragCoord.xy);

    //GameOfLife(current_cell);
    fungi(current_cell);
}
