#include "ofApp.h"

//--------------------------------------------------------------
void ofApp::setup()
{
	ofSetLogLevel(OF_LOG_VERBOSE);

	ofDisableArbTex();

	// setup ui
	gui.setup();
	ImGui::GetIO().MouseDrawCursor = false;
	d_bgColor = ofColor(114, 144, 154);

	std::vector<ofDefaultVertexType> verts = {
		{-1,  1, 0}, {1, 1,  0}, {1, -1, 0}, {-1, -1, 0}
	};
	std::vector<ofIndexType> indices = { 0, 2, 1, 0, 3, 2 };

	d_cam = std::make_unique<camera::FreeCamera>(
		glm::vec3(0.0, 0.0, 5.0),
		1280, 720,
		45.0f,
		glm::vec2(0.1, 500.0f)
		);

	d_mesh.addVertices(verts);
	d_mesh.addIndices(indices);

	d_image.setImageType(ofImageType::OF_IMAGE_COLOR_ALPHA);
	d_image.setUseTexture(true);
	d_image.loadImage("sample.png");

	d_shader.load("lab1.vert", "lab1.frag");
	d_shader.begin();
	d_shader.setUniform2f("iResolution", glm::vec2(1280, 720));
	d_shader.setUniform3f("eyePosition", d_cam->position());
	d_shader.setUniform3f("lookAt", d_cam->position() + d_cam->front());
	d_shader.bindAttribute(ofShader::POSITION_ATTRIBUTE, "in_Position");
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
	d_shader.setUniformTexture("uTexture", d_image.getTexture(), 0);
	d_shader.setUniform3f("eyePosition", d_cam->position());
	d_shader.setUniform3f("lookAt", d_cam->position() + d_cam->front());
	d_mesh.draw();
	d_shader.end();
	d_image.unbind();

	gui.begin();
	ImGui::Text("average %.3f ms/frame (%.1f FPS)", 1000.0f / ImGui::GetIO().Framerate, ImGui::GetIO().Framerate);
	ImGui::ColorEdit3("BG Color", (float*)&d_bgColor);
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
	if(button == 2) handleMouse((float)x, (float)y);
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
}

//--------------------------------------------------------------
void ofApp::dragEvent(ofDragInfo dragInfo) {

}
