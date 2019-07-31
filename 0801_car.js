<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Video Capture Example</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <script src="https://docs.opencv.org/3.4/opencv.js"></script>
    <script src="https://sample-4dd7b.firebaseapp.com/opencv.js"></script>
    <script src="https://obniz.io/js/jquery-3.2.1.min.js"></script>
    <script src="https://unpkg.com/obniz@2.2.0/obniz.js"></script>
    <style>
      .refrect-lr {
        -webkit-transform: scaleX(-1);
        -o-transform: scaleX(-1);
        -moz-transform: scaleX(-1);
        transform: scaleX(-1);
        filter: FlipH;
        -ms-filter: "FlipH";
      }
    </style>
  </head>
  <body>

    <div id="obniz-debug"></div>

    <div>
      <div class="control">
        <button id="startAndStop">Start</button>
      </div>
    </div>
    <p class="err" id="errorMessage"></p>
    <div>
      <table cellpadding="0" cellspacing="0" width="0" border="0">
        <tr>
          <td>
            <video id="videoInput" autoplay playsinline width=320 height=240 class="refrect-lr"></video>
          </td>
          <td>
            <canvas id="canvasOutput" width=320 height=240 style="-webkit-font-smoothing:none"

                    class="refrect-lr"></canvas>
          </td>
          <td></td>
          <td></td>
        </tr>
        <tr>
          <td>
            <div class="caption">videoInput</div>
          </td>
          <td>
            <div class="caption">canvasOutput</div>
          </td>
          <td></td>
          <td></td>
        </tr>
      </table>
    </div>

    <script src="https://webrtc.github.io/adapter/adapter-5.0.4.js" type="text/javascript"></script>
    <script src="https://docs.opencv.org/3.4/utils.js" type="text/javascript"></script>
    <script type="text/javascript">

      obniz = new Obniz("08169896");

      obniz.onconnect = async () => {
        motorLeft = obniz.wired("DCMotor", {forward: 0, back: 1});
        motorLeft.power(20);
        motorRight = obniz.wired("DCMotor", {forward: 2, back: 3});
        motorRight.power(20);
        obniz.io10.pull("3v");
        obniz.io10.output(true);
        obniz.io11.output(false);
      }

      let utils = new Utils('errorMessage');


      let streaming = false;
      let videoInput = document.getElementById('videoInput');
      let startAndStop = document.getElementById('startAndStop');
      let canvasOutput = document.getElementById('canvasOutput');
      let canvasContext = canvasOutput.getContext('2d');

      function successCallback(stream) {
        document.getElementById("videoInput").srcObject = stream;
        onVideoStarted();
      };

      function errorCallback(err) {
        console.error('mediaDevice.getUserMedia() error:', error);
      };

      startAndStop.addEventListener('click', () => {


        if (!streaming) {
          utils.clearError();

          const medias = {
            audio: false, video: {
              facingMode: "environment" 
            }
          };

          navigator.getUserMedia(medias, successCallback, errorCallback);


        } else {
          utils.stopCamera();
          onVideoStopped();
        }

      });

      function onVideoStarted() {
        streaming = true;
        startAndStop.innerText = 'Stop';
        start();
      }

      function onVideoStopped() {
        streaming = false;
        canvasContext.clearRect(0, 0, canvasOutput.width, canvasOutput.height);
        startAndStop.innerText = 'Start';
      }

      async function start() {
        let video = document.getElementById('videoInput');
        let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
        let dst = new cv.Mat(video.height, video.width, cv.CV_8UC4);
        let gray = new cv.Mat();
        let cap = new cv.VideoCapture(video);
        let lines = new cv.Mat();
        let binary = new cv.Mat();
        let color = new cv.Scalar(255, 0, 0);
        let startPoint_std = new cv.Point(150, 0);
        let endPoint_std = new cv.Point(150, 300);

        const FPS = 30;

        function processVideo() {
          try {
            if (!streaming) {
              // clean and stop.
              src.delete();
              dst.delete();
              gray.delete();
              binary.delete();
              return;
            }
            let begin = Date.now();
            // start processing.
            cap.read(src);
            src.copyTo(dst);
            cv.cvtColor(dst, gray, cv.COLOR_RGBA2GRAY, 0);
            let ksize = new cv.Size(5, 5);
            cv.GaussianBlur(gray, binary, ksize, 0, 0, cv.BORDER_DEFAULT); // add gaussian blur
            cv.threshold(binary, binary, 0, 255, cv.THRESH_BINARY+cv.THRESH_OTSU);//二値化（大津の閾値）
            cv.Canny(binary, binary, 50, 200, 3);//エッジ検出
            cv.HoughLinesP(binary, lines, 1, Math.PI / 180, 3, 12, 0);
            //         cv.HoughLines(binary, lines, 1, Math.PI / 180, 30, 0, 0, 0, Math.PI);

            let sum_angle = 0;
            let avg_angle = 0;

            //         console.log(lines.rows);
            // draw lines
            for (let i = 0; i < lines.rows; ++i) {
              let startPoint = new cv.Point(150, 200);
              let endPoint = new cv.Point(lines.data32S[i * 4 + 2], lines.data32S[i * 4 + 3]);
              let hori_diff = 150 - lines.data32S[i * 4 + 2];
              let vert_diff = 200 - lines.data32S[i * 4 + 3];
              let angle = Math.atan(vert_diff / hori_diff) * 360/(2*Math.PI);
              sum_angle = angle + sum_angle;
              //           if (angle > -120 && angle < -30){ 
              //             motorLeft.forward();
              //             motorRight.stop();
              //           } else if (angle > 30 && angle < 120){ 
              //             motorLeft.stop();
              //             motorRight.forward();
              //           } else {
              //             motorLeft.forward();
              //             motorRight.forward();
              //           }
              cv.line(dst, startPoint, endPoint, color);
            }

            avg_angle = sum_angle / lines.rows;
            console.log(avg_angle);
            if (avg_angle > -150 && avg_angle < -10){
              motorLeft.forward();
              motorRight.stop();
            } else if (avg_angle > 10 && avg_angle < 150){
              motorLeft.stop();
              motorRight.forward();
            } else {
              motorLeft.forward();
              motorRight.forward();
            }
            cv.line(dst, startPoint_std, endPoint_std, color);

            //         for (let i = 0; i < lines.rows; ++i) {
            //           let rho = lines.data32F[i * 2];
            //           let theta = lines.data32F[i * 2 + 1];
            //           let a = Math.cos(theta);
            //           let b = Math.sin(theta);
            //           let x0 = a * rho;
            //           let y0 = b * rho;
            //           let startPoint = {x: x0 - 1000 * b, y: y0 + 1000 * a};
            //           let endPoint = {x: x0 + 1000 * b, y: y0 - 1000 * a};
            //           cv.line(dst, startPoint, endPoint, [255, 0, 0, 255]);
            //         }

            cv.imshow('canvasOutput', dst);

            // schedule the next one.
            let delay = 1000 / FPS - (Date.now() - begin);
            setTimeout(processVideo, delay);

          } catch (err) {
            console.error(err);
          }
        };

        // schedule the first one.
        setTimeout(processVideo, 0);

      }
    </script>
  </body>
</html>