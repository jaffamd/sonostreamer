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
}

function test_input($data) {
  $data = trim($data);
  $data = stripslashes($data);
  $data = htmlspecialchars($data);
  return $data;
}
?>
