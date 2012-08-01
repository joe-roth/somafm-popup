//this function is called from the somafm.com home page which opens the popup
function popUpPlayer(Channel) {
URL="/soma/popup/?" + Channel;
newwindow=window.open(URL,'SomaPlayer','toolbar=0,scrollbars=0,location=0,statusbar=0,menubar=0,resizable=0,width=410,height=220,left = 200,top = 140');
if (window.focus) {newwindow.focus()}
} 
