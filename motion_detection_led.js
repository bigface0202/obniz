<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <script src="https://unpkg.com/@tensorflow/tfjs"></script>
    <script src="https://unpkg.com/@tensorflow-models/posenet"></script>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="https://obniz.io/js/jquery-3.2.1.min.js"></script>
    <script src="https://unpkg.com/obniz@2.2.0/obniz.js" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/stats.js/r16/Stats.js"></script>
    <style type="text/css">
      h2 {
        padding: 0.4em 0.5em;
        color: #494949;
        background: #f4f4f4;
        border-left: solid 5px #7db4e6;
        border-bottom: solid 3px #d7d7d7;
      }
      h3 {
        background: #c2edff;
        padding: 0.5em;
      }
      .btn-container {
        display: flex;
        justify-content: center;
      }
      .btn-control {
        flex-grow: 1;
        text-align: center;
      }
      .btn-control input {
        font-size: 1.6em;
        font-weight: bold;
        padding: 10px 30px;
        height: 80px;
        width: 90%;
      }
      .data-view {
        margin: 8px;
      }
      .status-view {
        font-size: 1.6em;
        font-weight: bold;
        background: #FFFF99;
        text-align: center;
        padding: 5px;
      }
    </style>
  </head>
  <body>
    <div id="obniz-debug"></div>
    <h1>Posenet-Obniz</h1>
    <h2>
      <div id="view-mode"></div>
    </h2>
    <h3>Change Mode</h3>
    <form id="form-select-mode">
      <select name="select-mode">
        <option value="1" selected>1: Mimic the posture of phone</option>
        <option value="2">2: Mimic your pose</option>
        <option value="3">3: Stare at you</option>
      </select>
      <input type="button" id="btn-set-mode" value="SET" />
      <div>
        <input type="button" id="btn-stop" value="STOP" />
        <input type="button" class="btn-reset" value="RESET" />
      </div>
    </form>
    <h3>Control</h3>
    <div>
      <label>Max Speed
        <br>
        <input type="range" id="rng-speed" min=0 max=3 step=1>
      </label>
    </div>
    <div>
      <label>LPF
        <br>
        <input type="range" id="rng-lpf" min=0 max=1 step=0.01>
      </label>
    </div>
    <div class="view-contents-mode2 view-contents-mode3">
      <video id="video" width="800px" height="600px" autoplay="1" style="position: absolute;"></video>
      <canvas id="canvas" width="800px" height="600px" style="position: relative;"></canvas>
    </div>
    <div class="view-contents-mode1">
      <div class="btn-container">
        <div class="btn-control">
          <input type="button" id="btn-reset" class="btn-reset" value="RESET">
        </div>
        <div class="btn-control">
          <input type="button" id="btn-start" value="START">
        </div>
      </div>
    </div>
    <h3>Status</h3>
    <div class="view-contents-mode1">
      <div id="d1" class="data-view status-view"></div>
      <div id="d2" class="data-view"></div>
      <div id="d3" class="data-view"></div>
    </div>
    <div id="d4" class="data-view"></div>
    <div id="print"></div>
  </body>
  <script>
    const imageScaleFactor = 0.8;
    const outputStride = 16;
    const flipHorizontal = true;
    const stats = new Stats();
    const canvas = document.getElementById('canvas');
    const contentWidth = canvas.width;
    const contentHeight = canvas.height;
    const fontLayout = "bold 20px Arial";
    const fontPoint = "bold 15px Arial";
    var score = 0;
    var mypose = new Object();
    var myposition = new Object();
    var cvw = canvas.width;
    var cvh = canvas.height;
    var ang_view = {//angle of view of webcam. for mode 3
      x: 90, y: 60
    };
    async function bindPage() {
      const net = await posenet.load();
      let video;
      try {
        video = await loadVideo();
      } catch (e) {
        console.error(e);
        return;
      }
      detectPoseInRealTime(video, net);
    }
    async function loadVideo() {
      const video = await setupCamera();
      video.play();
      return video;
    }
    async function setupCamera() {
      const video = document.getElementById('video');
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          'audio': false,
          'video': { width: contentWidth, height: contentHeight }
        });
        video.srcObject = stream;
        return new Promise(resolve => {
          video.onloadedmetadata = () => {
            resolve(video);
          };
        });
      } else {
        const errorMessage = "This browser does not support video capture, or this device does not have a camera";
        alert(errorMessage);
        return Promise.reject(errorMessage);
      }
    }
    function detectPoseInRealTime(video, net) {
      const ctx = canvas.getContext('2d');
      const flipHorizontal = true; // since images are being fed from a webcam
      async function poseDetectionFrame() {
        if (detect_pose == false) { return; }
        stats.begin();
        let poses = [];
        const pose = await net.estimateSinglePose(video, imageScaleFactor, flipHorizontal, outputStride);
        poses.push(pose);
        ctx.clearRect(0, 0, contentWidth, contentHeight);
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(contentWidth, 0);
        ctx.drawImage(video, 0, 0, contentWidth, contentHeight);
        ctx.restore();
        ctx.font = fontLayout;
        drawPoints(poses, ctx);
        stats.end();
        requestAnimationFrame(poseDetectionFrame);
      }
      poseDetectionFrame();
    }
    function getPart(partname, pose) {
      return pose["keypoints"].filter(function (partpoint) {
        if (partpoint.part == partname) {
          // console.log(partpoint);
          return true;
        }
      });
    }
    function drawPoints(poses, ctx) {
      poses.forEach(({ s, keypoints }) => {
        keypoints.forEach((partpoint) => {
          drawPoint(partpoint, ctx);
          drawPointName(partpoint, ctx);
        });
      });
      //get positions and scores
      var nose = getPart("nose", poses[0])[0];
      var eye_l = getPart("leftEye", poses[0])[0];
      var eye_r = getPart("rightEye", poses[0])[0];
      var ear_l = getPart("leftEar", poses[0])[0];
      var ear_r = getPart("rightEar", poses[0])[0];
      var wrist_r = getPart("rightWrist", poses[0])[0];
      var w_r = wrist_r.position;
      var n = nose.position;
      var l = eye_r.position;
      var r = eye_l.position;
      var p_ear_l = ear_l.position;
      var p_ear_r = ear_r.position;
      //Calculate scores
      var score = poses[0]["score"];
      var score_nose = nose.score;
      var score_face = (
        nose.score
        + eye_l.score
        + eye_r.score
        + ear_l.score
        + ear_r.score
      ) / 5;
      ctx.font = fontLayout;
      _mypose_yaw = Math.atan2(2 * n.x - l.x - r.x, r.x - l.x);
      var ear_y = (p_ear_l.y + p_ear_r.y) / 2;
      mypose.score = score;
      if (score_nose > 0.9) {
        ctx.fillStyle = "blue";
        myposition.yaw = 90 - Math.atan((cvw - 2 * n.x) / cvw * Math.tan(ang_view.x / 2 * Math.PI / 180)) * 180 / Math.PI;
        myposition.pitch = 90 + Math.atan((cvh - 2 * n.y) / cvh * Math.tan(ang_view.y / 2 * Math.PI / 180)) * 180 / Math.PI;
        ctx.fillText("Nose: " + myposition.yaw.toFixed(0) + ", " + myposition.pitch.toFixed(0), 20, 40);
//         if (w_r.y < 250.0){
//         led.on();
//       }
      } else {
        ctx.fillStyle = "red";
      }
      if (score_face > 0.75) {
        ctx.fillStyle = "blue";
        mypose.yaw = _mypose_yaw * -180 / Math.PI + 90;
        mypose.pitch = Math.asin(2 * (n.y - ear_y) * Math.cos(_mypose_yaw) / Math.abs(p_ear_r.x - p_ear_l.x)) * -180 / Math.PI + 90;
        ctx.fillText("Pose: " + mypose.yaw.toFixed(0) + ", " + mypose.pitch.toFixed(0), 20, 60);
      } else {
        ctx.fillStyle = "red";
      }
      if (w_r.y < 250.0){
        led.on();
      }else{
        led.off();
      }
      console.log(w_r.y);
      ctx.fillText("Score: " + score_nose.toFixed(2) + ", " + score_face.toFixed(2), 20, 20);
      ctx.fill();
    }
    function drawPoint(point, ctx) {
      ctx.beginPath();
      ctx.arc(point.position.x, point.position.y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = "pink";
      ctx.fill();
    }
    function drawPointName(point, ctx) {
      ctx.font = fontPoint;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(155, 187, 89, 0.7)';
      ctx.fillText(point.part, point.position.x, point.position.y);
      ctx.fill();
    }
    var servo_y, servo_p;
    var s_yaw, s_pitch;
    var led;
    var yaw0 = 0, pitch0 = 0;
    var mode = 1;
    var detect_pose = false;
    var smp = new Object();
    var max_dps = 300;
    var min_dps = 30;
    var lpf_a = 0.5;
    function constrain(amt, low, high) {
      return (amt) < (low) ? (low) : ((amt) > (high) ? (high) : (amt));
    };
    function diffAngle(ang, crt) {
      var ang_d = ang - crt;
      while (ang_d < 0 || ang_d > 360) {
        if (ang_d < 0) {
          ang_d += 360;
        } else if (ang_d > 360) {
          ang_d -= 360;
        }
      }
      return ang_d;
    }
    function setServo(yaw, pitch) {
      try {
        servo_y.angle(yaw);
        s_yaw = yaw;
        servo_p.angle(pitch);
        s_pitch = pitch;
        $('#d4').html("SERVO: " + s_yaw.toFixed(2) + ", " + s_pitch.toFixed(2));
      } catch (e) {
        console.error(e);
        return;
      }
    }
    function moveServoToward(yaw, pitch, max_deg, min_deg) {
      yaw = lpf_a * s_yaw + (1 - lpf_a) * yaw;
      pitch = lpf_a * s_pitch + (1 - lpf_a) * pitch;
      setServo(yaw, pitch);
    }
    function startServo(src, interval) {
      updateServo = setInterval(function () {
        // console.dir(src);
        max_deg = max_dps * (interval / 1000);
        min_deg = min_dps * (interval / 1000);
        moveServoToward(src.yaw, src.pitch, max_deg, min_deg);
      }, interval);
      $('#d1').html("RUNNING");
    }
    function stopServo() {
      if (typeof updateServo !== "undefined") {
        clearInterval(updateServo);
      }
      $('#d1').html("STOP");
    }
    $(document).ready(function () {
      $(".view-contents-mode1").hide();
      $(".view-contents-mode2").hide();
      $(".view-contents-mode3").hide();
      $('#btn-set-mode').on('click', function () {
        mode = $('[name=select-mode]').val();
        console.log('Mode changed! ' + mode);
        $('#view-mode').html('MODE' + mode + ': ' + $('[name=select-mode] option:selected').text());
        stopServo();
        detect_pose = false;
        $(".view-contents-mode1").hide();
        $(".view-contents-mode2").hide();
        $(".view-contents-mode3").hide();
        switch (mode) {
          case "1":
            $(".view-contents-mode1").show();
            break;
          case "2":
            $(".view-contents-mode2").show();
            detect_pose = true;
            bindPage();
            startServo(mypose, 100);
            break;
          case "3":
            $(".view-contents-mode3").show();
            detect_pose = true;
            bindPage();
            startServo(myposition, 100);
            break;
        }
      });
      if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', function (eventData) {
          $('#d2').html("RAW: " + eventData.alpha.toFixed(2) + ", " + eventData.beta.toFixed(2) + ", " + eventData.gamma.toFixed(2));
          smp.raw_yaw = eventData.alpha;
          smp.raw_pitch = eventData.beta;
          _smp_yaw = diffAngle(eventData.alpha, yaw0);
          smp.yaw = constrain(_smp_yaw, 90, 270) - 90;
          _smp_pitch = diffAngle(eventData.beta, pitch0);
          smp.pitch = constrain(_smp_pitch, 90, 270) - 90;
          $('#d3').html("PHONE: " + smp.yaw.toFixed(2) + ", " + smp.pitch.toFixed(2));
        });
      }
      $('.btn-reset').on('click', function () {
        setServo(90, 90);
        stopServo();
      });
      $('#btn-start').on('click', function () {
        yaw0 = smp.raw_yaw - 180;
        pitch0 = smp.raw_pitch - 180;
        startServo(smp, 50);
      });
      $('#btn-stop').on('click', function () {
        stopServo();
      });
      $('#rng-speed').on('input', function () {
        var ds = [50, 100, 300, 999];
        max_dps = ds[$(this).val() * 1];
        if (max_dps == 999) {
          min_dps = 0;
        } else {
          min_dps = Math.max(max_dps * 0.3, 50);
        }
      });
      $('#rng-lpf').on('input', function () {
        lpf_a = $(this).val();
      });
    });
    var obniz = new Obniz("08169896");
    obniz.onconnect = async function () {
      obniz.io8.drive("5v");
      obniz.io8.output(true);
      var voltage = await obniz.ad8.getWait();
      console.log(voltage);
      led = obniz.wired("LED", {anode:6, cathode:7});
      servo_y = obniz.wired("ServoMotor", { signal: 0, vcc: 1, gnd: 2 });
      servo_p = obniz.wired("ServoMotor", { signal: 3, vcc: 4, gnd: 5 });
      setServo(90, 90);
    }
  </script>
</html>