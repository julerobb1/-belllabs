(function() {
  var beaconScript = document.createElement('script');
  beaconScript.defer = true;
  beaconScript.src = "https://static.cloudflareinsights.com/beacon.min.js/vcd15cbe7772f49c399c6a5babf22c1241717689176015";
  beaconScript.integrity = "sha512-ZpsOmlRQV6y907TI0dKBHq9Md29nnaEIPlkf84rnaERnq6zvWvPUqr2ft8M1aS28oN72PdrCzSjY4U6VaAw1EQ==";
  beaconScript.crossOrigin = "anonymous";
  beaconScript.dataset.cfBeacon = '{"rayId":"91e6d348a885462c","serverTiming":{"name":{"cfExtPri":true,"cfL4":true,"cfSpeedBrain":true,"cfCacheStatus":true}},"version":"2025.1.0","token":"43b68c692d14434cae6dd171559b7fd7"}';
  document.head.appendChild(beaconScript);
})();
