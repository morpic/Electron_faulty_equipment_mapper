var installer = require('electron-winstaller');
var path      = require('path');

console.log("packaging into a exe...");
resultPromise = installer.createWindowsInstaller({
    appDirectory:    './electronn-win32-x64',
    outputDirectory: './Output',
    exe:             './electronn.exe',
    noMsi:           true,
    // iconUrl:         'IconUrl',
    // setupIcon:       'IconPath'
});

resultPromise.then(function () {
    console.log("Installer created");
});



//instructions for compiling an already packaged electron project
//install electron-squirrel-startup
///copy squirell code into your main.js file top and bottom.
//package your file with electron-packager has to be electron packager - must be done with electron packager (electron-packager C:\Users\harri\my_Projects\JScript\Electron --platform=win32 --arch=x64)
//make sure appname does not have any hyphens (C:\Users\harri\my_Projects\JScript\Electron\MyApp-win32-x64\resources\app/package.json) --> change app name in package.json
//put packaged file in same folder as your electron project
//create a build.js file with installer configs
//create output folder where the exe will be created.
////https://ourcodeworld.com/articles/read/365/how-to-create-a-windows-installer-for-an-application-built-with-electron-framework

//the path after electron packager is for where your project folder is located.
// step1:electron-packager C:\Users\harri\my_Projects\JScript\Electron --platform=win32 --arch=x64
//this runs the command to convert your packaged electron file into a exe
//step2: node build.js
//step3: electron file should be located in your output folder within your project folder
