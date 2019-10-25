#include "ofMain.h"
#include "ofApp.h"

//========================================================================
int main()
{

	ofGLWindowSettings settings;
	settings.glVersionMajor = 4;
	settings.glVersionMinor = 5;
	settings.title = "SDF Lab";
	settings.setSize(1280, 720);
	settings.windowMode = ofWindowMode::OF_WINDOW;

	ofCreateWindow(settings);

	ofRunApp(new ofApp());

}
