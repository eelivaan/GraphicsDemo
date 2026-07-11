#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <iostream>
#include <fstream>

void processInput(GLFWwindow* window);
int loadShaders();

int main(int argc, char** argv)
{
    glfwInit();
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

    GLFWwindow* window = glfwCreateWindow(800, 800, "Raytracing", NULL, NULL);
    if (window == NULL)
    {
        std::cout << "Failed to create GLFW window" << std::endl;
        glfwTerminate();
        return -1;
    }
    glfwMakeContextCurrent(window);

    if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress))
    {
        std::cout << "Failed to initialize GLAD" << std::endl;
        return -1;
    }

    glViewport(0, 0, 800, 800);

	int shaderProgram = loadShaders();
    if (shaderProgram == -1)
    {
        glfwTerminate();
        return -1;
    }

    unsigned int VAO;
    glGenVertexArrays(1, &VAO);
	glBindVertexArray(VAO);

    float vertices[] = {
        -1.0f, -1.0f, 0.0f,
        1.0f, -1.0f, 0.0f,
        1.0f,  1.0f, 0.0f,

        1.0f,  1.0f, 0.0f,
	    -1.0f, 1.0f, 0.0f,
        -1.0f, -1.0f, 0.0f
    };

    unsigned int VBO;
    glGenBuffers(1, &VBO);
    glBindBuffer(GL_ARRAY_BUFFER, VBO);
    glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
    glEnableVertexAttribArray(0);

	const int timeUniformLocation = glGetUniformLocation(shaderProgram, "time");

    while (!glfwWindowShouldClose(window))
    {
		processInput(window);

        // rendering
        glClearColor(0.3f, 0.3f, 0.5f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);

        glUseProgram(shaderProgram);
        glBindVertexArray(VAO);
        if (timeUniformLocation != -1)
            glUniform1f(timeUniformLocation, (GLfloat)glfwGetTime());
        glDrawArrays(GL_TRIANGLES, 0, 6);

        glfwPollEvents();
        glfwSwapBuffers(window);
    }

    glfwTerminate();
    return 0;
}

// process all input: query GLFW whether relevant keys are pressed/released this frame and react accordingly
// ---------------------------------------------------------------------------------------------------------
void processInput(GLFWwindow* window)
{
    if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS)
        glfwSetWindowShouldClose(window, true);
}

int loadShaders()
{
    int  success;
    char infoLog[512];

	std::ifstream vertexShaderFile("shaders/screenquad.vert");
    if (!vertexShaderFile.is_open())
    {
        std::cout << "Failed to open vertex shader file" << std::endl;
        return -1;
    }
	std::ifstream fragmentShaderFile("shaders/simple_raytrace.frag");
	if (!fragmentShaderFile.is_open())
	{
		std::cout << "Failed to open fragment shader file" << std::endl;
		return -1;
	}
	std::string vertexShaderSource((std::istreambuf_iterator<char>(vertexShaderFile)), 
                                   std::istreambuf_iterator<char>());
	std::string fragmentShaderSource((std::istreambuf_iterator<char>(fragmentShaderFile)),
                                     std::istreambuf_iterator<char>());
	vertexShaderFile.close();
	fragmentShaderFile.close();

    // vertex shader
    unsigned int vertexShader;
    vertexShader = glCreateShader(GL_VERTEX_SHADER);
    const char* vertexShaderSourceCStr = vertexShaderSource.c_str();
    glShaderSource(vertexShader, 1, &vertexShaderSourceCStr, NULL);
    glCompileShader(vertexShader);
    glGetShaderiv(vertexShader, GL_COMPILE_STATUS, &success);
    if (!success)
    {
        glGetShaderInfoLog(vertexShader, 512, NULL, infoLog);
        std::cout << "ERROR::SHADER::VERTEX::COMPILATION_FAILED\n" << infoLog << std::endl;
    }

    // pixel shader
    unsigned int fragmentShader;
    fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
	const char* fragmentShaderSourceCStr = fragmentShaderSource.c_str();
    glShaderSource(fragmentShader, 1, &fragmentShaderSourceCStr, NULL);
    glCompileShader(fragmentShader);
    glGetShaderiv(fragmentShader, GL_COMPILE_STATUS, &success);
    if (!success)
    {
        glGetShaderInfoLog(fragmentShader, 512, NULL, infoLog);
        std::cout << "ERROR::SHADER::PIXEL::COMPILATION_FAILED\n" << infoLog << std::endl;
    }

    // link together to a shader program
    unsigned int shaderProgram;
    shaderProgram = glCreateProgram();
    glAttachShader(shaderProgram, vertexShader);
    glAttachShader(shaderProgram, fragmentShader);
    glLinkProgram(shaderProgram);
    glGetProgramiv(shaderProgram, GL_LINK_STATUS, &success);
    if (!success) {
        glGetProgramInfoLog(shaderProgram, 512, NULL, infoLog);
		std::cout << "ERROR::SHADER::PROGRAM::LINKING_FAILED\n" << infoLog << std::endl;
    }
    
    glDeleteShader(vertexShader);
    glDeleteShader(fragmentShader);

    return shaderProgram;
}
