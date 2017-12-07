# Player-Piano


To run the server, you need to have Node on your computer, available here https://nodejs.org/en/

Once you have node installed, if on windows open command prompt or powershell anywhere and test it with

node -v

This should echo a version number for node.

Once you have node properly installed, download the project zip and unzip it wherever you want.  You need to unzip the node_modules.zip in place and the midifiles.zip in place within the project folder.  

Once this is done, try running the server by opening a command prompt in the project folder (shift-right click, open command prompt here).  Run by using the command

node index.js

This should start the server.  If you get an error saying something about pianoserial or serialport, run the following command

npn install serialport

This should install the serialport module to the write place in the folder.  Run the following command

node index.js

Again, and the server should start on port 3000.  To go to the web page, open your favorite web browser (recommend chrome), and go to:

localhost:3000

This should take you to the piano homepage!
