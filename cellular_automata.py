import moderngl
import moderngl_window
import os
import numpy as np

class App(moderngl_window.WindowConfig):
    gl_version = (3, 3)
    title = "Cellular Automata"
    window_size = (600, 600)
    aspect_ratio = 1.0
    resizable = False
    clear_color = None

    #resource_dir = os.path.normpath(os.path.join(__file__, '../data'))

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self.grid_resolution = (150, 150)

        with open(os.path.join(__file__, "../shaders/raymarcher.vert")) as file_vert:
            vertex_source = file_vert.read()
            with open(os.path.join(__file__, "../shaders/cellular_automata.frag")) as file_frag:
                self.cellular_prog = self.ctx.program(
                    vertex_shader = vertex_source,
                    fragment_shader = file_frag.read()
                )
            with open(os.path.join(__file__, "../shaders/buffer_to_screen.frag")) as file_frag:
                self.screen_prog = self.ctx.program(
                    vertex_shader = vertex_source,
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

        self.cellular_vao = self.ctx.simple_vertex_array(self.cellular_prog, self.vbo, 'in_vert', mode = self.ctx.TRIANGLES)
        self.cellular_prog.get("Resolution", None).value = self.grid_resolution[0]

        self.screen_vao = self.ctx.simple_vertex_array(self.screen_prog, self.vbo, 'in_vert', mode = self.ctx.TRIANGLES)
        self.screen_prog.get("Resolution", None).value = self.grid_resolution[0]

        self.rts = [None, None]
        self.fbos = [None, None]

        self.rts[0] = self.ctx.texture(self.grid_resolution, 4, dtype = "f1")
        self.fbos[0] = self.ctx.framebuffer(self.rts[0])

        self.rts[1] = self.ctx.texture(self.grid_resolution, 4, dtype = "f1")
        self.fbos[1] = self.ctx.framebuffer(self.rts[1])

        self.flipflop = 0
        self.last_update_time = 0.0
        self.mouse_event_queue = []


    def mouse_press_event(self, x: int, y: int, button: int):
        self.mouse_event_queue.append((x,y,button))
        return super().mouse_press_event(x, y, button)


    def render(self, time, frame_time):
        if (time > self.last_update_time+0.1):
            for x,y,button in self.mouse_event_queue:
                grid_x = int(np.floor(x / self.wnd.size[0] * self.grid_resolution[0]))
                grid_y = int(np.floor((1.0 - y / self.wnd.size[1]) * self.grid_resolution[1]))

                # left click
                if button == 1:
                    data = bytearray([0xFF, 0x0, 0x0, 0x0])
                # right click
                elif button == 2:
                    data = bytearray([0x0, 0x0, 0x0, 0x0])

                for offset_x in range(-1,2):
                    for offset_y in range(-1,2):
                        self.rts[not self.flipflop].write(data, (grid_x + offset_x, grid_y + offset_y, 1, 1))
            self.mouse_event_queue.clear()

            self.fbos[self.flipflop].use()
            self.rts[not self.flipflop].use(location=0)
            self.ctx.clear()
            self.cellular_vao.render()

            self.flipflop = not self.flipflop
            self.last_update_time = time

        self.ctx.screen.use()
        self.rts[not self.flipflop].use(location=0)
        self.screen_vao.render()


if __name__ == '__main__':
    App.run()
