# Google Cloud Deployment Template

Use this template for easily deploy project within the repo to google cloud.

## How to

Just push your changes to develop or live branch and see your application 
running on [Google Cloud](https://console.cloud.google.com/kubernetes/ingresses?project=brdata-dev&supportedpurview=project&pageState=(%22savedViews%22:(%22i%22:%220ccc310c55074400ad028e9f7cc3f960%22,%22c%22:%5B%5D,%22n%22:%5B%5D)))

## ⚠️ Caution:

- Don't change files in `.github` folder
- Check, if `config.yaml` is configured properly
- Don't delete values from config.yaml`, just adapt or add values

## config.yaml

```yaml
isEnabled: # [REQUIRED] Whether to trigger deployments on push
docker:
  preset: # [OPTIONAL] Environment to build and run application: yarn, java, python
  preparationCommand: # [OPTIONAL] used for additional downloads before building and running your app
  imageFrom:  # [OPTIONAL]  If no preset is used this is required
  ignore: # Ignore some files / Folders which are not used for running the app
build:
  command: # [REQUIRED] Command for building your app
  outputFolder: # [OPTIONAL] Empty for using all of root folder
run:
  command: # [REQUIRED] Command for running your app
  envs: # [OPTIONAL] Environment Variables to inject
    - name: # [REQUIRED] Environment Variable name
      value: # [REQUIRED] Environment Variable value
addOns:
  firestore: # [OPTIONAL] Inject Credentials for firestore
  inSecure: # [OPTIONAL] Disable basic auth on DEV
```
