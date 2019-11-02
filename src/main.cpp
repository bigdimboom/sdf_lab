#include "ofMain.h"
#include "ofApp.h"
#include "preprocess.h"

//========================================================================
int main()
{

	ofGLWindowSettings settings;
	settings.glVersionMajor = 4;
	settings.glVersionMinor = 5;
	settings.title = "SDF Lab";
	settings.setSize(WIN_RES_WIDTH, WIN_RES_HEIGHT);
	settings.windowMode = ofWindowMode::OF_WINDOW;

	ofCreateWindow(settings);

	ofRunApp(new ofApp());

}
