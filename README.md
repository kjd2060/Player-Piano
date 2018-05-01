# Player-Piano


To run the server, you need to have Node on your computer, available here https://nodejs.org/en/

Once you have node installed, if on windows open command prompt or powershell anywhere and test it with

node -v

This should echo a version number for node.

Once you have node properly installed, download the project zip and unzip it wherever you want.  You then need to do one of the following:
1) For future MSD teams, check the Edge repository for node_modules.zip and download + unzip it so that the modules are in a folder called node_modules at the top level of the folder you put this source into.
2) If you can't find that zip or want to do it this way, open the package.json.  In package.json you'll see what modules you need.  Use:

        npm get (module name)
   To get the modules individually.
   
You also need to get midifiles.zip from the Edge repository, or create your own folder called midifiles and put some midi files in there.  Note that if there are no midi files in the folder you'll get an error when you try and run it.

Once this is done, try running the server by opening a command prompt in the project folder (shift-right click in the folder on windows, open command prompt here).  Run by using the command

node index.js

This should start the server.  If you get an error saying something about pianoserial or serialport, run the following command

npm install serialport

This should install the serialport module to the write place in the folder.  Run the following command

node index.js

Again, and the server should start on port 3000.  To go to the web page, open your favorite web browser (recommend chrome), and go to:

localhost:3000

This should take you to the piano homepage!

See the README.txt, and EXISTING_ISSUES.txt for more information.
