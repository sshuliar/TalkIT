const fs = require('fs');
const moment = require('moment');
var AWS = require('aws-sdk');
var phantomjs = require('phantomjs-prebuilt');

// runtime specific vars
const screenshotTempFile = process.env.SCREENSHOT_TEMP_FILE || '/tmp/phantomjs_screenshot.png';

// cloudwatch
const metricNamespace = process.env.METRIC_NAMESPACE || 'PhantomJS';
const environmentId = process.env.ENVIRONMENT_ID || 'development';

// s3 screenshots
const uploadToS3 = process.env.UPLOAD_TO_S3 || 'false';
const bucketName = process.env.BUCKET_NAME || 'ssh-pipeline';
const bucketPrefix = process.env.BUCKET_PREFIX || 'phantomjs/screenshots';
const bucketExpiry = process.env.BUCKET_EXPIRY_DAYS || '14';

// upload screenshot
const uploadScreenshot = async (fileName) => {
    const s3FileName = `${moment().format('YYYYMMDDHHmmss')}.png`
    const expiration = parseInt(bucketExpiry);
    const objectExpiration = moment().add(expiration, 'days');
    const objectName = `${bucketPrefix}/${environmentId}/${moment().format('YYYYMMDD')}/${s3FileName}`;
    const request = {
        Body: fs.createReadStream(`${fileName}`),
        Bucket: bucketName,
        Key: objectName,
        Expires: objectExpiration.toDate(),
        ContentType: 'image/png'
    };
    const s3 = new AWS.S3();
    return new Promise((resolve, reject) => {
        s3.putObject(request, (error, data) => {
            if (error) {
                reject(error);
            } else {
                console.log(`Screenshot saved in ${bucketName} bucket, object name ${objectName}`);
                //fs.unlinkSync(`${fileName}`);
                resolve(data);
            }
        })
    });
};

exports.handler = function(event, context, callback) {
    console.log('Lambda is started. Starting PhantomJS script ...');
    var phantom = phantomjs.exec('phantomjs-script.js', screenshotTempFile);

    phantom.stdout.on('data', function(buf) {
        console.log('[STR] stdout "%s"', String(buf).trim());
    });
    phantom.stderr.on('data', function(buf) {
        console.log('[STR] stderr "%s"', String(buf).trim());
    });
    phantom.on('close', function(code) {
        console.log('[END] code', code);
    });
    phantom.on('exit', code => {
        if (uploadToS3) { uploadScreenshot(screenshotTempFile) };
        var bitmap = fs.readFileSync(screenshotTempFile);
        var response = {
            "statusCode": 200,
            "headers": {
                "Content-Type": "image/png"
            },
            "body": Buffer(bitmap).toString('base64'),
            "isBase64Encoded": true
        };
        callback(null, response);
    });
};
