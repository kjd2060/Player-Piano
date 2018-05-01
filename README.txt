1) For Windows users you'll probably get errors when trying to initially run that have something to do with rpio.  You need to change the 
   include statement where it's gotten to

   "./rpio" instead of just "rpio" or "/rpio" 

   because of Windows handling files/folders.  Note also that Windows users will have some issues with other modules like spicomm because they use
   packages that don't work on Windows but do on the Pi.

2) Some bugs exist still, see EXISTING_ISSUES.txt

3) Most code should be commented.  If you're unfamiliar with web development with Node...get familiar.  The advantage to the Node web app vs. a desktop
   app is that using the node app hits the usability requirements that Ron has/had in terms of accessability and being able to access the system across a range of devices.  As such, with most of the heavy lifting done, future teams should be able to expand the UI controls and some of the backend as necessary.