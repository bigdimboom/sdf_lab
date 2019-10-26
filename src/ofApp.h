#pragma once

#include "ofMain.h"
#include "ofxImGui.h"
#include "ofGLProgrammableRenderer.h"

#include <vector>
#include <memory>
#include "camera.h"

class ofApp : public ofBaseApp {

public:
	void setup();
	void update();
	void draw();

	void keyPressed(int key);
	void keyReleased(int key);
	void mouseMoved(int x, int y);
	void mouseDragged(int x, int y, int button);
	void mousePressed(int x, int y, int button);
	void mouseReleased(int x, int y, int button);
	void mouseEntered(int x, int y);
	void mouseExited(int x, int y);
	void windowResized(int w, int h);
	void dragEvent(ofDragInfo dragInfo);
	void gotMessage(ofMessage msg);

private:

	ofxImGui::Gui gui;
	ImVec4 d_bgColor;
	ofShader d_shader;
	ofMesh d_mesh;
	ofImage d_image;
	std::unique_ptr<camera::FreeCamera> d_cam;

	float lastX = 0.0f;
	float lastY = 0.0f;
	void handleMouse(float x, float y);

	void configureShader();
	void updateShader();

};
