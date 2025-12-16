import os
import moderngl_window as mglw
import numpy as np

class Test(mglw.WindowConfig):
    gl_version = (3, 3)
    title = "Raymarcher"
    window_size = (600, 600)
    aspect_ratio = window_size[0] / window_size[1]
    resizable = True

    #resource_dir = os.path.normpath(os.path.join(__file__, '../data'))

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        with open(os.path.join(__file__, "../shaders/raymarcher.vert")) as file_vert:
            with open(os.path.join(__file__, "../shaders/raymarcher.frag")) as file_frag:
                self.prog = self.ctx.program(
                    vertex_shader = file_vert.read(),
                    fragment_shader = file_frag.read()
                )

        vertices = np.array([
            -1.0, -1.0,
            -1.0, +1.0,
            +1.0, +1.0,
            -1.0, -1.0,
            +1.0, +1.0,
            +1.0, -1.0
        ], dtype='f4')

        self.vbo = self.ctx.buffer(vertices)
        self.vao = self.ctx.simple_vertex_array(self.prog, self.vbo, 'in_vert', mode = self.ctx.TRIANGLES)
        self.uniform_time = self.prog.get("time", 0.0);

    def render(self, time, frame_time):
        self.uniform_time.value = time;
        self.ctx.clear()
        self.vao.render()


if __name__ == '__main__':
    Test.run()
