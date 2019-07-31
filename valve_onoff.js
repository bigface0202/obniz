<!-- HTML Example -->
<!-- 遠隔で人工筋肉を動かす-->
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://obniz.io/js/jquery-3.2.1.min.js"></script>
  <script src="https://unpkg.com/obniz@2.2.0/obniz.js"></script>
</head>
<body>

<div id="obniz-debug"></div>
<h1>LED Switch</h1>
<button id="on">ON</button>
<button id="off">OFF</button>

<script>
  var obniz = new Obniz("08169896");
  obniz.onconnect = async function () {
    
    obniz.io2.drive("5v");
    obniz.io2.output(true);
    var voltage = await obniz.ad2.getWait();
    console.log(voltage);
    var led = obniz.wired("LED", {anode:0, cathode:1});
    $("#on").on("click",function(){
      led.on();
    });
    $("#off").on("click",function(){
      led.off();
    });
  };

</script>
</body>
</html>