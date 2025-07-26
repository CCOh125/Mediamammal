My takeaways from deploying onto Google Cloud PLatform

Package.json: Make sure the name matches the Google cloud console name. Also need express dependancy

Need to create an app.yaml file, make sure app.yaml uses a supported Node.js runtime, nodejs20 is supported

Install Google Cloud CLI:
I went to https://cloud.google.com/sdk/docs/install, and followed instructions to get a folder google-cloud-sdk

Then I accessed a terminal at that folder and setted it up.
cd ~/google-cloud-sdk
./install.sh

To create the project.
gcloud projects create aaaaaa-bbb --name="Aaaaaa Bbb"
or set to existing project.
gcloud config set project aaaaaa-bbb
Checking value of the project.
gcloud config get_value project

Getting ready for deployment:
Make to sure to enable cloud build.
gcloud services enable cloudbuild.googleapis.com
Grant Cloud Build permissions
gcloud projects add-iam-policy-binding mediamammaltest

Make sure pack-lock.json is in sync with package.json.
package.json needs files to be in directory its looking for.
Change all the files to the GCP backend.
fetch('https://aaaaa-bbb.uc.r.appspot.com/...*', {
 * Specific endpoints used in program

Finally deployment
gcloud app deploy

I had to add an Environmental Variable(API_KEY), go to Cloud Shell and enter a command ???




