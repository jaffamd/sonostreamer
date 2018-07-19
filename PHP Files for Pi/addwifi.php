<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Add WiFi Network Details</title>
  <style>
    .error {color: #FF0000;}
  </style>
</head>

<body>
  <?php
    $ssid = $psk = "";
    if ($_SERVER["REQUEST_METHOD"] == "POST") {
      if (empty($_POST["ssid"])) {
        $nameErr = "Network name is required";
      } else {
        $ssid = test_input($_POST["ssid"]);
      }
  
      if (empty($_POST["psk"])) {
        $nameErr = "Password is required";
      } else {
        $psk = test_input($_POST["psk"]);
      }

      if (($ssid != "") && ($psk != "")) {
        $file = fopen("/etc/wpa_supplicant/wpa_supplicant.conf", "r") or die("Unable to open file!");
        
        $x=1;
        $lastAP = "";

        while (!feof($file)) {
          $line = fgets($file);
          if (strpos($line, "id_str") !== false) {
            $lastAP = "AP" . $x;
            $x++;
          }
        }
        fclose($file);

        $file = fopen("/etc/wpa_supplicant/wpa_supplicant.conf", "a") or die("Unable to open file!");
        $strtowrite = PHP_EOL . 'network={' . PHP_EOL . '    ssid="' . $psk . '"' . PHP_EOL . '    psk="' . $psk . '"' . PHP_EOL . '    id_str="AP' . $x . '"' . PHP_EOL . '}';
        fwrite($file, $strtowrite) or die("Unable to write file!");
        fclose($file);
        echo 'New WiFi Network Added!';
    }
    
    function test_input($data) {
      $data = trim($data);
      $data = stripslashes($data);
      $data = htmlspecialchars($data);
      return $data;
    }
  ?>
  
  <form action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]);?>" method="post">
  WiFi Network Name: <input type="text" name="ssid"><span class="error">* <?php echo $nameErr;?></span><br><br>
  WiFi Network Password: <input type="text" name="psk"><span class="error">* <?php echo $nameErr;?></span><br><br>
  <input type="submit">
  </form>
</body>
</html>