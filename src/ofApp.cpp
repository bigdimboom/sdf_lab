#include "ofApp.h"
#include "preprocess.h"

#define GLSL_VERSION "#version 450\n"
#define VS "lab1.vert"
#define FS "lab2.frag"
#define SDF_HEADER "hg_sdf.glsl"

//--------------------------------------------------------------
void ofApp::setup()
{
	ofSetLogLevel(OF_LOG_VERBOSE);

	ofDisableArbTex();

	// setup ui
	gui.setup();
	ImGui::GetIO().MouseDrawCursor = false;
	d_bgColor = ofColor(0, 0, 0);

	std::vector<ofDefaultVertexType> verts = {
		{-1,  1, 0}, {1, 1,  0}, {1, -1, 0}, {-1, -1, 0}
	};
	std::vector<ofIndexType> indices = { 0, 2, 1, 0, 3, 2 };

	d_cam = std::make_unique<camera::FreeCamera>(
		glm::vec3(0.0, 0.0, 5.0),
		WIN_RES_WIDTH, WIN_RES_HEIGHT,
		CAM_FOV,
		glm::vec2(0.1, 500.0f)
		);

	d_mesh.addVertices(verts);
	d_mesh.addIndices(indices);

	d_image.setImageType(ofImageType::OF_IMAGE_COLOR_ALPHA);
	d_image.setUseTexture(true);
	d_image.loadImage("sample.png");

	loadShader();
	d_shader.begin();
	configureShader();
	d_shader.end();
}

//--------------------------------------------------------------
void ofApp::update() {

}

//--------------------------------------------------------------
void ofApp::draw()
{
	ofSetBackgroundColor(d_bgColor);

	d_image.bind(0);
	d_shader.begin();
	updateShader();
	d_mesh.draw();
	d_shader.end();
	d_image.unbind();

	gui.begin();
	ImGui::Text("average %.3f ms/frame (%.1f FPS)", 1000.0f / ImGui::GetIO().Framerate, ImGui::GetIO().Framerate);
	ImGui::ColorEdit3("BG Color", (float*)&d_bgColor);
	ImGui::Text("sec: %f", ofGetElapsedTimeMillis() / 1000.0f);
	if (ImGui::Button("Reload Shader"))
	{
		loadShader();
		d_shader.begin();
		configureShader();
		d_shader.end();
	}
	gui.end();
}

//--------------------------------------------------------------
void ofApp::keyPressed(int key)
{
	switch (key)
	{
	case 'w':
		d_cam->translateForward(0.1);
		break;
	case 's':
		d_cam->translateForward(-0.1);
		break;
	case 'a':
		d_cam->translateRight(-0.1);
		break;
	case 'd':
		d_cam->translateRight(0.1);
		break;
	default:
		break;
	}
}

//--------------------------------------------------------------
void ofApp::keyReleased(int key) {

}

//--------------------------------------------------------------
void ofApp::mouseMoved(int x, int y)
{
}

//--------------------------------------------------------------
void ofApp::mouseDragged(int x, int y, int button)
{
	if (button == 2) handleMouse((float)x, (float)y);
}

//--------------------------------------------------------------
void ofApp::mousePressed(int x, int y, int button) {

	if (button == 2)
	{
		lastX = x;
		lastY = y;
		ofHideCursor();
	}
}

//--------------------------------------------------------------
void ofApp::mouseReleased(int x, int y, int button) {

	ofShowCursor();
}

//--------------------------------------------------------------
void ofApp::mouseEntered(int x, int y) {

}

//--------------------------------------------------------------
void ofApp::mouseExited(int x, int y) {

}

//--------------------------------------------------------------
void ofApp::windowResized(int w, int h) {

}

//--------------------------------------------------------------
void ofApp::gotMessage(ofMessage msg) {

}

void ofApp::handleMouse(float xpos, float ypos)
{
	float xoffset = xpos - lastX;
	float yoffset = lastY - ypos;  // Reversed since y-coordinates go from bottom to left

	lastX = xpos;
	lastY = ypos;

	d_cam->pitch(yoffset * 0.8f);
	d_cam->yaw(xoffset * 0.8f);

	if (d_shader.isLoaded())
	{
		d_shader.begin();
		d_shader.setUniform4f("iMouse", lastX, lastY, xpos, ypos);
		d_shader.end();
	}
}


void ofApp::loadShader()
{
	auto sdf_lib_source = ofBufferFromFile(SDF_HEADER).getText();
	auto vs_source = ofBufferFromFile(VS).getText();
	auto fs_source = ofBufferFromFile(FS).getText();

	std::string directive = "#version";
	auto size = directive.size() + 4;

	sdf_lib_source.erase(sdf_lib_source.find(directive), size);
	fs_source.erase(fs_source.find(directive), size);
	vs_source.erase(vs_source.find(directive), size);

	d_shader.setupShaderFromSource(GL_VERTEX_SHADER, GLSL_VERSION + vs_source);
	d_shader.setupShaderFromSource(GL_FRAGMENT_SHADER, GLSL_VERSION + sdf_lib_source + fs_source);
	d_shader.linkProgram();
}

void ofApp::configureShader()
{
	d_shader.bindAttribute(ofShader::POSITION_ATTRIBUTE, "in_Position");

	d_shader.setUniform2f("iResolution", glm::vec2(WIN_RES_WIDTH, WIN_RES_HEIGHT));
	d_shader.setUniform1f("iTime", ofGetElapsedTimeMillis() / 1000.0f);
	d_shader.setUniform1f("camFov", CAM_FOV);

	d_shader.setUniform3f("eyePosition", d_cam->position());
	d_shader.setUniform3f("lookAtDir", d_cam->front());
	d_shader.setUniformMatrix4f("view", d_cam->view());
}

void ofApp::updateShader()
{
	d_shader.setUniform1f("iTime", ofGetElapsedTimeMillis() / 1000.0f);

	d_shader.setUniform3f("eyePosition", d_cam->position());
	d_shader.setUniform3f("lookAtDir", d_cam->front());
	d_shader.setUniformMatrix4f("view", d_cam->view());
	d_shader.setUniform3f("bgColor", d_bgColor.x, d_bgColor.y, d_bgColor.z);
}

//--------------------------------------------------------------
void ofApp::dragEvent(ofDragInfo dragInfo) {

}
