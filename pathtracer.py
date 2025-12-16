import os
import moderngl
import moderngl_window as mglw
import numpy as np

class Test(mglw.WindowConfig):
    gl_version = (3, 3)
    title = "Pathtracer"
    window_size = (600, 600)
    aspect_ratio = 1.0
    resizable = True

    #resource_dir = os.path.normpath(os.path.join(__file__, '../data'))

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        with open(os.path.join(__file__, "../shaders/raymarcher.vert")) as file_vert:
            with open(os.path.join(__file__, "../shaders/pathtracer.frag")) as file_frag:
                with open(os.path.join(__file__, "../shaders/random.glsl")) as file_random:
                    with open(os.path.join(__file__, "../shaders/shapes.glsl")) as file_shapes:
                        with open(os.path.join(__file__, "../shaders/PBR.glsl")) as file_PBR:
                            shader_source = "#version 460\n"
                            shader_source += file_random.read()
                            shader_source += file_shapes.read()
                            shader_source += file_PBR.read()
                            shader_source += file_frag.read()
                            #shader_source.replace('include_random.glsl', file_random.read())
                            #print(shader_source)
                    self.prog = self.ctx.program(
                        vertex_shader = file_vert.read(),
                        fragment_shader = shader_source
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
        self.uniform_num_steps = self.prog.get("num_steps", 1)
        self.uniform_iteration = self.prog.get("iteration", 1)

        self.ctx.enable(moderngl.BLEND)
        #self.clear_color = None

        self.render_target = self.ctx.renderbuffer(self.ctx.screen.size, 4, 0, "f4")
        self.fbo = self.ctx.framebuffer(self.render_target)

        self.num_steps = 100
        self.step = 0


    def render(self, time, frame_time):        
        if self.step < self.num_steps:
            self.uniform_num_steps.value = self.num_steps
            self.uniform_iteration.value = self.step
            self.fbo.use()
            self.ctx.blend_func = moderngl.ADDITIVE_BLENDING
            #self.ctx.clear()
            self.vao.render()

            self.wnd.title = f"frame {self.step+1}/{self.num_steps}"

        self.ctx.screen.use()
        self.ctx.copy_framebuffer(self.ctx.screen, self.fbo)

        self.step += 1



if __name__ == '__main__':
    Test.run()
