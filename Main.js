//module delcarations
const electron = require("electron");
const {BrowserWindow, Menu, ipcMain} = electron;
const app = electron.app
// this should be placed at top of main.js to handle setup events quickly
if (handleSquirrelEvent(app)) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
}
const fs = require('fs');
const url = require("url");
const xlsx = require("xlsx");
const dns = require("dns");
const os = require("os");
const path = require("path");
const promisify = require("util").promisify;
// const {app, BrowserWindow, Menu, ipcMain} = electron;

//boolean triggers to continue code
var triggerForStep2 = true;
var triggerForStep3 = true;
var triggerForStep4 = true;
var triggerForStep5 = true;
var triggerForStep6 = false;
var triggerForStep7 = true;

//global variables - only global variable that is actually neccessary is mainSchedulingObject - all other global variable exists coz i couldnt be bothered optimising
var pathWay = os.userInfo().homedir + "\\Documents" + "\\JSON.txt";
var errorPathWay = os.userInfo().homedir + "\\Documents" + "\\errorText.txt"
var jsonData;
var mainSchedulingObject = new Object();
var mainObject = new Object();
var mainCalibrationObject = new Object();
/////////////////////////////////all functions listed at top but not called until further down

async function readCalibrationSheet(filePathWay,sheetName,columnName){

    let hyd, dateCalibrated

    let wb = await xlsx.readFile(filePathWay)
    let ws = wb.Sheets[sheetName]
    hyd = null, dateCalibrated = null

    for(var i = 0; i < 5; i++){
        for(var j= 0; j < 30; j++){
            let searchValue = ws[xlsx.utils.encode_cell({c:j,r:i})]
            if(searchValue !== undefined && searchValue !== null && searchValue !== ""){
                if(new RegExp(/Hydstra/,"i").test(searchValue.v) === true){
                    hyd = j;
                }else if(new RegExp(columnName,"i").test(searchValue.v) === true){
                    dateCalibrated = j;
                }
            }
        }
    }
    
    if(hyd === null){
        return
    }else{
        for(var k = 0; k < 300; k++){
            let hydIdentity = ws[xlsx.utils.encode_cell({c:hyd,r:k})]
            if(hydIdentity !== null && hydIdentity !== undefined){
                let dateIdentity = ws[xlsx.utils.encode_cell({c:dateCalibrated,r:k})]
                if(dateIdentity !== null && dateIdentity !== undefined){
                    if(dateIdentity.w !== null && dateIdentity.w !== undefined){
                        var apart = dateIdentity.w.toString().split("/");
                        if(apart.length === 3){
                            var dateCompare = new Date("06/31/" + (new Date().getFullYear() - 1).toString());
                            var calibrateDate = new Date(apart[0].toString() + "/" + apart[1].toString() + "/" + apart[2].toString())
                            var humanReadableDate = apart[1].toString() + "/" + apart[0].toString() + "/" + apart[2].toString()
                            if(calibrateDate < dateCompare || calibrateDate.toString() === "Invalid Date"){
                                if(mainCalibrationObject[hydIdentity.v.toString().toUpperCase()] === undefined){
                                    mainCalibrationObject[hydIdentity.v.toString().toUpperCase()] = humanReadableDate
                                }
                            }
                        }     
                    }
                }
            }
        }
    } 
}

//function that checks if there is a file present in C/[username]/documents. if there is just read it, if there isnt create one.
//this is will be the users configuration file - if he needs custom changes to the program
async function JSONfileCheckerAndCreater(){
    var defaults = {
        "schedulingSheets": {
            "longTermTeam1":"S:\\E&I\\EMS\\Yagoona\\PROJECTS\\40-41\\WR004097\\Scarborough\\Scheduling\\Scheduling Sheet - LT Team 1 Crew.xlsm",
            "longTermTeam2":"S:\\E&I\\EMS\\Yagoona\\PROJECTS\\40-41\\WR004097\\Scarborough\\Scheduling\\Scheduling Sheet - LT Team 2 Crew.xlsm",
            "TreatmentTeam":"S:\\E&I\\EMS\\Yagoona\\PROJECTS\\40-41\\WR004097\\Scarborough\\Scheduling\\Scheduling Sheet - Treatment Crew.xlsm",
            "projectsTeam1":"S:\\E&I\\EMS\\Yagoona\\PROJECTS\\40-41\\WR004097\\Scarborough\\Scheduling\\Scheduling Sheet - Projects Team 1 Crew.xlsm",
            "projectsTeam2":"S:\\E&I\\EMS\\Yagoona\\PROJECTS\\40-41\\WR004097\\Scarborough\\Scheduling\\Scheduling Sheet - Projects Team 2 Crew.xlsm",
            "projectsTeam3":"S:\\E&I\\EMS\\Yagoona\\PROJECTS\\40-41\\WR004097\\Scarborough\\Scheduling\\Scheduling Sheet - Projects Team 3 Crew.xlsm"
        },
        "masterSheets": {
            "longTermMasterSheet":"S:\\E&I\\EMS\\Yagoona\\PROJECTS\\40-41\\WR004097\\Wastewater Current Operations\\Site Masterlist SEWER and RAIN.xls",
            "projectsMasterSheet":"S:\\E&I\\EMS\\Yagoona\\PROJECTS\\40-41\\WR004097\\Wastewater Current Operations\\Site Masterlist Projects.xlsx"
        },
        "calibrationSheet":{
            "longtermCalibrationSheet":"S:\\E&I\\EMS\\Yagoona\\PROJECTS\\40-41\\WR004097\\Wastewater Current Operations\\LT Sewer_Rain\\Wastewater & Rain Calibration Tracking 2019-2020.xls",
            "projectsCalibrationSheets":"S:\\E&I\\EMS\\Yagoona\\PROJECTS\\40-41\\WR004097\\Wastewater Current Operations\\Site Masterlist Projects Calibration Tracking.xlsm"
        },
        "defaultCanvasDates": "1",
        "required drive": "H:\\"
        }
        
    try {
        fs.accessSync(pathWay,fs.constants.F_OK);
        var tempData = JSON.parse(fs.readFileSync(pathWay));
        return tempData;
    } catch (error) {
        if(error){
            try {
                fs.writeFileSync(pathWay,JSON.stringify(defaults, null, 4),"UTF8");
                var tempData = JSON.parse(fs.readFileSync(pathWay));
                return tempData;
            } catch (error) {
                if(error){
                    fs.writeFileSync(errorPathWay,JSON.stringify(error, null, 4),"UTF8");
                    console.log("error within a error");
                    triggerForStep2 = false;
                    return;
                }
            }
        }
    }
}

//function that checks all conditions are met before continueing on with the rest of the code - conditions like H drive exists and connected to internet
async function conditionsChecker(){
 
    //check if required Drive is there
    try {
        fs.accessSync(jsonData["required drive"], fs.constants.R_OK)
    } catch (error) {
        if(error){
            fs.writeFileSync(errorPathWay,JSON.stringify(error, null, 4),"UTF8");
            console.log("directory does not exist");
            triggerForStep3 = false;
            return;
        }
    }

    //check if connected to internet - have not implemented yet
    try {
        (async function (){
            try {
                var interwebsPromise = promisify(dns.lookup);
                var interwebs = await interwebsPromise("google.com");

            } catch (error) {
                if(error){
                    fs.writeFileSync(errorPathWay,JSON.stringify(error, null, 4),"UTF8");
                    triggerForStep3 = false;
                    return;
                }
            }
        })()
        
    } catch (error) {
        if(error){
            console.log(error);
            fs.writeFileSync(errorPathWay,JSON.stringify(error, null, 4),"UTF8");
            triggerForStep3 = false;
            return;
        }
    }
}

//this function is used by the "readAllschedulingSheets" function as pseudo constructor function
function schedulingSheetObject(hydstraID, dateAddedToOutStanding, PriorityRaised, raisedIssue, plannedSiteVisit, crewComment, origin){
    this.HydstraNum = hydstraID,
    this.DateAdded = dateAddedToOutStanding,
    this.Priority = PriorityRaised,
    this.Issue = raisedIssue,
    this.PlannedVisit = plannedSiteVisit,
    this.Comment = crewComment,
    this.FromSheet = origin
}

//function that reads scheduling sheets and appends it to the global variable mainSchedulingObject
async function readAllschedulingSheets(schedulingSheetArray){
    let hyd, dateAdded, urgency, problem, plannedDate, teamComment, offset

    let wb = await xlsx.readFile(schedulingSheetArray);
    let ws = wb.Sheets["Outstanding"];

    hyd = null, dateAdded = null, urgency = null, problem = null, plannedDate = null, teamComment = null, offset = null

    for(var w = 0; w < 5; w++){
        for (var e = 0; e < 30; e++){
            let searchValue = ws[xlsx.utils.encode_cell({c:e,r:w})]
            if(searchValue !== undefined && searchValue !== null && searchValue !== ""){
                if(new RegExp(/Site Number/,"i").test(searchValue.v) === true){
                    hyd = e;
                    offset = w;
                }else if(new RegExp(/Date added to Outstanding/,"i").test(searchValue.v) === true){
                    dateAdded = e;
                }else if(new RegExp(/Priority Raised/,"i").test(searchValue.v) === true){
                    urgency = e;
                }else if(new RegExp(/Raised Issue/,"i").test(searchValue.v) === true){
                    problem = e;
                }else if(new RegExp(/Planned Site Visit Date/,"i").test(searchValue.v) === true){
                    plannedDate = e;
                }else if(new RegExp(/Crew Comments/,"i").test(searchValue.v) === true){
                    teamComment = e;
                }
            }
        }
    }

    if(hyd === null){
        return;
    }else{
        //////////////////////// had to traverse through the entire object tree - hundreds of nested objects within each other to find maxRows
        let maxRows = xlsx.utils.decode_range(ws["!ref"])["e"]["r"]

        for(var r = 0 + offset; r < maxRows; r++){
            let tempObjectStorer = null;
            tempObjectStorer = new schedulingSheetObject();
            let identifier = ws[xlsx.utils.encode_cell({c:hyd,r:r})];
            
            if(identifier !== null && identifier !== undefined){
                tempObjectStorer["HydstraNum"] = identifier.v.toString().toUpperCase();
                tempObjectStorer["FromSheet"] = schedulingSheetArray.toString();

                if(dateAdded !== null){
                    if(ws[xlsx.utils.encode_cell({c:dateAdded,r:r})] !== null && ws[xlsx.utils.encode_cell({c:dateAdded,r:r})] !== undefined){
                        tempObjectStorer["DateAdded"] = ws[xlsx.utils.encode_cell({c:dateAdded,r:r})].w.toString();
                    }
                }

                if(urgency !== null){
                    if(ws[xlsx.utils.encode_cell({c:urgency,r:r})] !== null && ws[xlsx.utils.encode_cell({c:urgency,r:r})] !== undefined){
                        tempObjectStorer["Priority"] = ws[xlsx.utils.encode_cell({c:urgency,r:r})].v.toString();
                    }
                }

                if(problem !== null){
                    if(ws[xlsx.utils.encode_cell({c:problem,r:r})] !== null && ws[xlsx.utils.encode_cell({c:problem,r:r})] !== undefined){
                        tempObjectStorer["Issue"] = ws[xlsx.utils.encode_cell({c:problem,r:r})].v.toString();
                    }
                }

                if(plannedDate !== null){
                    if(ws[xlsx.utils.encode_cell({c:plannedDate,r:r})] !== null && ws[xlsx.utils.encode_cell({c:plannedDate,r:r})] !== undefined){
                        tempObjectStorer["PlannedVisit"] = ws[xlsx.utils.encode_cell({c:plannedDate,r:r})].w.toString();
                    }else{
                        tempObjectStorer["PlannedVisit"] = "No planned visit date"
                    }
                }

                if(teamComment !== null){
                    if(ws[xlsx.utils.encode_cell({c:teamComment,r:r})] !== null && ws[xlsx.utils.encode_cell({c:teamComment,r:r})] !== undefined){
                        tempObjectStorer["Comment"] = ws[xlsx.utils.encode_cell({c:teamComment,r:r})].v.toString();
                    }
                }

                if(mainSchedulingObject[identifier.v.toString().toUpperCase()] === undefined){
                    mainSchedulingObject[identifier.v.toString().toUpperCase()] = tempObjectStorer;
                }else{
                    continue;
                }
            }
        }
    }
}

//this function is used by the "readMasterListAndLoadObject" function as pseudo constructor function
function siteObject(hydstraID, maximo, gaugeAdd, lat, longs, team ,hazards, logger, manholeAss ){
    this.HydstraNum = hydstraID,
    this.MaximoNum = maximo,
    this.GaugeAddress = gaugeAdd,
    this.Latitude = lat,
    this.Longitude = longs,
    this.AssignedCrew = team,
    this.SpecialHazards = hazards,
    this.LoggerType = logger,
    this.ManholeAN = manholeAss
}

//function that reads masterlist sheets
async function readMasterListAndLoadObject(masterListArray){

    let hyd, max, addres, coordlat, coordlong, crew, haz, instrument, MH

    let wb = await xlsx.readFile(masterListArray);
    let arrayOfSheetnames = wb.SheetNames;

    for(var q = 0; q < arrayOfSheetnames.length; q++){

        let ws = wb.Sheets[arrayOfSheetnames[q]];
        hyd = null, max = null, addres = null, coordlat = null, coordlong = null, crew = null, instrument = null, MH = null

        //this is to search for heading names using regex - will probably remain hard coded
        for(var w = 0; w < 5; w++){
            for (var e = 0; e < 30; e++){
                let searchValue = ws[xlsx.utils.encode_cell({c:e,r:w})]
                if(searchValue !== undefined && searchValue !== null && searchValue !== ""){
                    if(new RegExp(/hydstra #/,"i").test(searchValue.v) === true){
                        hyd = e
                    }else if(new RegExp(/latitude/,"i").test(searchValue.v) === true){
                        coordlat = e
                    }else if(new RegExp(/longitude/,"i").test(searchValue.v) === true){
                        coordlong = e
                    }else if(new RegExp(/assigned crew/,"i").test(searchValue.v) === true){
                        crew = e
                    }else if(new RegExp(/Special Hazards-Access Conditions/,"i").test(searchValue.v) === true){
                        haz = e
                    }else if(new RegExp(/gauge address/,"i").test(searchValue.v) === true || new RegExp(/site location/,"i").test(searchValue.v) === true){
                        addres = e
                    }else if(new RegExp(/maximo #/,"i").test(searchValue.v) === true){
                        max = e
                    }else if(new RegExp(/logger type/,"i").test(searchValue.v) === true){
                        instrument = e
                    }else if(new RegExp(/Manhole Asset Number/,"i").test(searchValue.v) === true){
                        MH = e
                    }
                }
            }
        }

        if(hyd === null){
            //console.log(arrayOfSheetnames[q])
            continue;
        }else{
            let maxRows = xlsx.utils.decode_range(ws["!ref"])["e"]["r"];
            
            for(var r = 0; r < maxRows; r++){
            //     let hyd, max, addres, coordlat, coordlong, crew, haz, instrument, MH

            // this.HydstraNum = hydstraID;
            // this.MaximoNum = maximo;
            // this.GaugeAddress = gaugeAdd;
            // this.Latitude = lat;
            // this.Longitude = longs;
            // this.AssignedCrew = team;
            // this.SpecialHazards = hazards;
            // this.LoggerType = logger;
            // this.ManholeAN = manholeAss;

                let tempObjectStorer = null;
                tempObjectStorer = new siteObject();
                let identifier = ws[xlsx.utils.encode_cell({c:hyd,r:r})];
                
                if(identifier !== null && identifier !== undefined){
                    tempObjectStorer["HydstraNum"] = identifier.v.toString().toUpperCase();

                    
                    if(max !== null){
                        if(ws[xlsx.utils.encode_cell({c:max,r:r})] !== null && ws[xlsx.utils.encode_cell({c:max,r:r})] !== undefined){
                            tempObjectStorer["MaximoNum"] = ws[xlsx.utils.encode_cell({c:max,r:r})].v.toString();
                        }
                    }
                    
                    if(addres !== null){
                        if(ws[xlsx.utils.encode_cell({c:addres,r:r})] !== null && ws[xlsx.utils.encode_cell({c:addres,r:r})] !== undefined){
                            tempObjectStorer["GaugeAddress"] = ws[xlsx.utils.encode_cell({c:addres,r:r})].v.toString();
                        }
                    }
                    
                    if(coordlat !== null){
                        if(ws[xlsx.utils.encode_cell({c:coordlat,r:r})] !== null && ws[xlsx.utils.encode_cell({c:coordlat,r:r})] !== undefined) {
                            tempObjectStorer["Latitude"] = ws[xlsx.utils.encode_cell({c:coordlat,r:r})].v.toString();
                        }
                    }
                    
                    if(coordlong !== null){
                        if(ws[xlsx.utils.encode_cell({c:coordlong,r:r})] !== null && ws[xlsx.utils.encode_cell({c:coordlong,r:r})] !== undefined){
                            tempObjectStorer["Longitude"] = ws[xlsx.utils.encode_cell({c:coordlong,r:r})].v.toString();
                        }
                    }
                    
                    if(crew !== null){
                        if(ws[xlsx.utils.encode_cell({c:crew,r:r})] !== null & ws[xlsx.utils.encode_cell({c:crew,r:r})] !== undefined){
                            tempObjectStorer["AssignedCrew"] = ws[xlsx.utils.encode_cell({c:crew,r:r})].v.toString();
                        }
                    }
                    
                    if(haz !== null){
                        if(ws[xlsx.utils.encode_cell({c:haz,r:r})] !== null && ws[xlsx.utils.encode_cell({c:haz,r:r})] !== undefined){
                            tempObjectStorer["SpecialHazards"] = ws[xlsx.utils.encode_cell({c:haz,r:r})].v.toString();
                        }else{
                            tempObjectStorer["SpecialHazards"] = "No Special Access Conditions/Hazards"
                        }
                    }
                    
                    if(instrument !== null){
                        if(ws[xlsx.utils.encode_cell({c:instrument,r:r})] !== null && ws[xlsx.utils.encode_cell({c:instrument,r:r})] !== undefined){
                            tempObjectStorer["LoggerType"] = ws[xlsx.utils.encode_cell({c:instrument,r:r})].v.toString();
                        }
                        
                    }
                    
                    if(MH !== null){
                        if(ws[xlsx.utils.encode_cell({c:MH,r:r})] !== null && ws[xlsx.utils.encode_cell({c:MH,r:r})] !== undefined){
                            tempObjectStorer["ManholeAN"] = ws[xlsx.utils.encode_cell({c:MH,r:r})].v.toString();
                        }
                    }
                    
                    if(mainObject[identifier.v.toString().toUpperCase()] === undefined){
                        mainObject[identifier.v.toString().toUpperCase()] = tempObjectStorer;
                    }else{
                        continue;
                    }
                }    
            }
        }       
    }
}

//function to check if our excelsheets exist (all of them - masterlist and scheduling sheets)
async function checkIfFilesExist(data){
    try {
        for(d in data["schedulingSheets"]){
            fs.accessSync(data["schedulingSheets"][d], fs.constants.R_OK);
        }
    } catch (error) {
        if(error){
            console.log("one of the sheets dont exists");
            fs.writeFileSync(errorPathWay,JSON.stringify(error, null, 4),"UTF8");
            triggerForStep4 = false;
        }
    }

    try {
        for(d in data["masterSheets"]){
            fs.accessSync(data["masterSheets"][d], fs.constants.R_OK);
        }
    } catch (error) {
        if(error){
            console.log("one of the sheets dont exists");
            fs.writeFileSync(errorPathWay,JSON.stringify(error, null, 4),"UTF8");
            triggerForStep4 = false;
        }
    }
}

async function overArchFunc(){

    jsonData = await JSONfileCheckerAndCreater();

    if(triggerForStep2 === true){
        await conditionsChecker();
        if(triggerForStep3 === true){
            await checkIfFilesExist(jsonData);

            if(triggerForStep4 === true){

                try {

                    for(scheduledSheets in jsonData["schedulingSheets"]){
                        await readAllschedulingSheets(jsonData["schedulingSheets"][scheduledSheets]);
                    }
                
                    for(masterSheets in jsonData["masterSheets"]){
                        await readMasterListAndLoadObject(jsonData["masterSheets"][masterSheets]);
                    }
    
                    for(key in mainSchedulingObject){
                        if(mainObject[key] !== undefined){
                            Object.assign(mainSchedulingObject[key], mainObject[key]);
                        }
                    }
                    
                } catch (error) {
                    if(error){
                        triggerForStep5 = false;
                        fs.writeFileSync(errorPathWay,JSON.stringify(error, null, 4),"UTF8");
                        console.log(error);
                        return;
                    }
                }

                if(triggerForStep5 === true){
                    mainWindow.loadURL(url.format({
                        pathname: path.join(__dirname, "mainWindow.html"),
                        protocol: 'file:',
                        slashes: true
                    }))

                    triggerForStep6 = true
                }

                try {
                    if(triggerForStep6 === true){
                        async function initializeReadOnCalibrationSheets(){
                            try {
                                await readCalibrationSheet(jsonData["calibrationSheet"]["longtermCalibrationSheet"],"Sewer","Current Calibration");
                                await readCalibrationSheet(jsonData["calibrationSheet"]["projectsCalibrationSheets"],"IICATS Gauges","Current Calibration");
                                await readCalibrationSheet(jsonData["calibrationSheet"]["projectsCalibrationSheets"],"WWOA Hydrostatic","Current Calibration");
                                await readCalibrationSheet(jsonData["calibrationSheet"]["projectsCalibrationSheets"],"WWOA dbi","Current Calibration");
                            } catch (error) {
                                triggerForStep7 = false
                                fs.writeFileSync(errorPathWay,JSON.stringify(error, null, 4),"UTF8");
                                return;
                            } 
                        }
                        initializeReadOnCalibrationSheets();
                        // readCalibrationSheet()
                    }
                } catch (error) {
                    fs.writeFileSync(errorPathWay,JSON.stringify(error, null, 4),"UTF8");
                    return;
                }
            }
        }
    }
    // fs.writeFileSync("C:\\Users\\harri\\my_Projects\\mainSchedulingObject.txt",JSON.stringify(mainSchedulingObject, null, 4),"UTF8");
}

////////////////////////////////////////////////////////////////   THIS CODE IS FOR THE RENDERING ENGINE   //////////////////////////////////////////////////////////////////////////////////////
var mainMenuTemplate = [
    {
        label: "File",
        submenu:[
            {
                role: "reload",
                accelerator: process.platform == 'darwin' ? 'Command+j' :
                'F5',
            }
        ]
    },
    {
        label: "Developer Tools",
        submenu: [
            {
                label: "Toggle DevTools",
                accelerator: process.platform == 'darwin' ? 'Command+j' :
                'Ctrl+Shift+J',
                click(item, focusedWindow){
                    focusedWindow.toggleDevTools()
                }
            },
            {
                label: "Hide UI",
                click(){
                    mainWindow.webContents.send("Hide UI","Hide")
                }
            },
            {
                label: "Refresh Data(This relaunches the app)",
                click(){
                    app.relaunch()
                    app.quit()
                }
            }
        ]
    },
    {
        label: "Quit",
        accelerator: process.platform == 'darwin' ? 'Command+Q' :
        'Ctrl+Q',
        click(){
            app.quit();
        }
    }
]

app.on('ready', ()=>{
// // ************************************** DEPRACATED
        // var username = os.userInfo().username
        // canvasTextFilePathWay = path.join("C:/","Users/",username,"/AppData/","canvasFile.txt")
        // fs.writeFileSync(canvasTextFilePathWay,"",{flag: "w"})
// // ************************************** DEPRACATED

    // // listens for app to be ready
    // // Create new window
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true
        }
        // ,fullscreen: true //sets electron to full screen and not google maps -- be sure to disable ui in google maps
    })

    //this maximize's the window as soon as the mainWindow is created
    mainWindow.maximize();

    // //Load checker html into window
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, "checkerWindow.html"),
        protocol: 'file:',
        slashes: true
    }))

    // // Build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    // //Insert menu
    Menu.setApplicationMenu(mainMenu);

    ipcMain.on("frontToBackRequestData",(event, cbArg1)=>{
        event.reply("BackToFrontHereIsYourRequestData", mainSchedulingObject);
    })

    // // this is to detect that have receieved the aok to load server and use the correct filePaths
    ipcMain.on("filePaths",(event, arg)=>{
        overArchFunc();
    })

    mainWindow.on("closed",function(){
        mainWindow = null;
        app.quit();
    })
        // setTimeout(() => {
            // await fs.writeFile(canvasTextFilePathWay, dataToSendFromCanvas, (err)=>{
            //     dataToSendFromCanvas = [] // //need to empty out the array otherwise it just keeps getting bigger and bigger
            // canvasDataFromTextFile = fs.readFileSync(canvasTextFilePathWay, "UTF8") //this is usually canvasTextFilePathWay / blankTextFile
            // })
        // }, 2000);
        //this is how you send data to front end without event being emitted from the front end.
        // var gg = mainWindow.webContents.send("foo","bar")
    ipcMain.on("calibrationDataReady",(event, cbArg1)=>{
        event.reply("caliData", mainCalibrationObject);
    })

})


function handleSquirrelEvent(application) {
    if (process.argv.length === 1) {
        return false;
    }

    const ChildProcess = require('child_process');
    const path = require('path');

    const appFolder = path.resolve(process.execPath, '..');
    const rootAtomFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
    const exeName = path.basename(process.execPath);

    const spawn = function(command, args) {
        let spawnedProcess, error;

        try {
            spawnedProcess = ChildProcess.spawn(command, args, {
                detached: true
            });
        } catch (error) {}

        return spawnedProcess;
    };

    const spawnUpdate = function(args) {
        return spawn(updateDotExe, args);
    };

    const squirrelEvent = process.argv[1];
    switch (squirrelEvent) {
        case '--squirrel-install':
        case '--squirrel-updated':
            // Optionally do things such as:
            // - Add your .exe to the PATH
            // - Write to the registry for things like file associations and
            //   explorer context menus

            // Install desktop and start menu shortcuts
            spawnUpdate(['--createShortcut', exeName]);

            setTimeout(application.quit, 1000);
            return true;

        case '--squirrel-uninstall':
            // Undo anything you did in the --squirrel-install and
            // --squirrel-updated handlers

            // Remove desktop and start menu shortcuts
            spawnUpdate(['--removeShortcut', exeName]);

            setTimeout(application.quit, 1000);
            return true;

        case '--squirrel-obsolete':
            // This is called on the outgoing version of your app before
            // we update to the new version - it's the opposite of
            // --squirrel-updated

            application.quit();
            return true;
    }
};