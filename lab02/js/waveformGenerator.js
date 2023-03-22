// This object represent the waveform generator
var WaveformGenerator = {
    // The generateWaveform function takes 4 parameters:
    //     - type, the type of waveform to be generated
    //     - frequency, the frequency of the waveform to be generated
    //     - amp, the maximum amplitude of the waveform to be generated
    //     - duration, the length (in seconds) of the waveform to be generated
    generateWaveform: function(type, frequency, amp, duration) {
        var nyquistFrequency = sampleRate / 2; // Nyquist frequency
        var totalSamples = Math.floor(sampleRate * duration); // Number of samples to generate
        var result = []; // The temporary array for storing the generated samples

        var oneCycle = sampleRate / frequency;
        var halfCycle = oneCycle / 2;

        switch(type) {
            case "sine-time": // Sine wave, time domain
                for (var i = 0; i < totalSamples; ++i) {
                    var currentTime = i / sampleRate;
                    result.push(amp * Math.sin(2.0 * Math.PI * frequency * currentTime));
                }
                break;

            case "square-time": // Square wave, time domain
                for (var i = 0; i < totalSamples; i++) {
                    var whereInTheCycle = i % parseInt(oneCycle);
                    if(whereInTheCycle < halfCycle)
                        result.push(amp);
                    else
                        result.push(-amp);
                }
                break;

            case "square-additive": // Square wave, additive synthesis
                for (var i = 0; i < totalSamples; i++){
                    var t = i / sampleRate;
                    var sample = 0;
                    for(var k = 1; k * frequency < nyquistFrequency; k+=2){
                        sample += (1.0 / k) * Math.sin(2.0 * Math.PI * k * frequency * t);
                    }
                    result.push(amp * sample);
                }
                break;

            case "sawtooth-time": // Sawtooth wave, time domain
                for (var i = 0; i < totalSamples; i++) {
                    var whereInTheCycle = i % parseInt(oneCycle);
                    var fractionInTheCycle = whereInTheCycle / oneCycle;
                    result.push(amp * (2 * (1.0 - fractionInTheCycle) - 1));
                }
                break;

            case "sawtooth-additive": // Sawtooth wave, additive synthesis
                for (var i = 0; i < totalSamples; i++) {
                    var t = i / sampleRate;
                    var sample = 0;
                    for(var k = 1; k * frequency < nyquistFrequency; k++){
                        sample += (1.0 / k) * Math.sin(2.0 * Math.PI * k * frequency * t);
                    }
                    result.push(amp * sample);
                }
                break;

            case "triangle-additive": // Triangle wave, additive synthesis
                for (var i = 0; i < totalSamples; i++) {
                    var t = i / sampleRate;
                    var sample = 0;
                    for(var k = 1; k * frequency < nyquistFrequency; k+=2){
                        sample += (1.0 / (k * k)) * Math.cos(2.0 * Math.PI * k * frequency * t);
                    }
                    result.push(amp * sample);
                }
                break;

            case "customized-additive-synthesis": // Customized additive synthesis
                // Obtain all the required parameters
				var harmonics = [];
				for (var h = 1; h <= 10; ++h) {
					harmonics.push($("#additive-f" + h).val());
                    console.log(parseFloat(harmonics[h-1]));
				}
                
                for(var i = 0; i < totalSamples; i++) {
                    var t = i / sampleRate;
                    var sample = 0;
                    for(var k = 1; k <= 10 && k * frequency < nyquistFrequency; k++){
                        var harmonicsAmp = parseFloat(harmonics[k-1]);
                        sample += (harmonicsAmp * Math.sin(2.0 * Math.PI * k * frequency * t));
                    }
                    result.push(amp * sample);
                }
                break;

            case "white-noise": // White noise
                for (var i = 0; i < totalSamples; i++){
                    result.push(amp * (Math.random() * 2 - 1));
                }
                break;

            case "karplus-strong": // Karplus-Strong algorithm

                // Obtain all the required parameters
                var base = $("#karplus-base>option:selected").val();
                var b = parseFloat($("#karplus-b").val());
                var delay = parseInt($("#karplus-p").val());
                var isFindPFromFrequency = $("#karplus-use-freq").prop("checked");
                
                if(isFindPFromFrequency){
                    delay = parseInt(oneCycle);
                    console.log(delay);
                }

                if(base == "white-noise"){
                    for(var i = 0; i < totalSamples; i++){
                        result.push(0);
                        if(i <= delay){
                            result[i] = amp * (Math.random() * 2 - 1);
                        }else if(Math.random() < b){
                            result[i] = 0.5 * (result[i-delay] + result[i-delay-1]); 
                        }else{
                            result[i] = -0.5 * (result[i-delay] + result[i-delay-1]); 
                        }
                    }
                }else{
                    for(var i = 0; i < totalSamples; i++){
                        result.push(0);
                        if(i <= delay){
                            var fractionInTheCycle = i * 1.0 / delay;
                            result[i] = amp * (2 * (1.0 - fractionInTheCycle) - 1);
                        }else if(Math.random() < b){
                            result[i] = 0.5 * (result[i-delay] + result[i-delay-1]); 
                        }else{
                            result[i] = -0.5 * (result[i-delay] + result[i-delay-1]); 
                        }
                    }
                }
                break;

            case "fm": // FM
                // Obtain all the required parameters
                var carrierFrequency = parseFloat($("#fm-carrier-frequency").val());
                var carrierAmplitude = parseFloat($("#fm-carrier-amplitude").val());
                var modulationFrequency = parseFloat($("#fm-modulation-frequency").val());
                var modulationAmplitude = parseFloat($("#fm-modulation-amplitude").val());
                
                var useFreqMulti = $("#fm-use-freq-multiplier").prop("checked");
                if(useFreqMulti){
                    carrierFrequency *= frequency;
                    modulationFrequency *= frequency;
                }

                var useADSR = $("#fm-use-adsr").prop("checked");
                if(useADSR) { // Obtain the ADSR parameters
                    var attackDuration = parseFloat($("#fm-adsr-attack-duration").val()) * sampleRate;
                    var decayDuration = parseFloat($("#fm-adsr-decay-duration").val()) * sampleRate;
                    var releaseDuration = parseFloat($("#fm-adsr-release-duration").val()) * sampleRate;
                    var sustainLevel = parseFloat($("#fm-adsr-sustain-level").val()) / 100.0;
                    
                    for(var i = 0; i < totalSamples; ++i) {
                        var currentTime = i / sampleRate;
                        var modulator = modulationAmplitude * Math.sin(2 * Math.PI * modulationFrequency * currentTime);

                        if(i <= attackDuration){
                            modulator *= lerp(0, 1, i * 1.0 / attackDuration);
                        }else if(i - attackDuration <= decayDuration){
                            modulator *= lerp(1, sustainLevel, (i - attackDuration) * 1.0 / decayDuration);
                        }else if(i <= totalSamples - releaseDuration){
                            modulator *= sustainLevel;
                        }else{
                            modulator *= lerp(sustainLevel, 0, (i - totalSamples + releaseDuration) * 1.0 / releaseDuration);
                        }
                        
                        var carrier = carrierAmplitude * Math.sin(2 * Math.PI * carrierFrequency * currentTime + modulator);
                        result.push(amp * carrier);
                    }

                }else{
                    for (var i = 0; i < totalSamples; ++i) {
                        var currentTime = i / sampleRate;
                        var modulator = modulationAmplitude * Math.sin(2 * Math.PI * modulationFrequency * currentTime);
                        var carrier = carrierAmplitude * Math.sin(2 * Math.PI * carrierFrequency * currentTime + modulator);
                        result.push(amp * carrier);
                    }
                }

                break;

            case "repeating-narrow-pulse": // Repeating narrow pulse
                var cycle = Math.floor(sampleRate / frequency);
                for (var i = 0; i < totalSamples; ++i) {
                    if(i % cycle === 0) {
                        result.push(amp * 1.0);
                    } else if(i % cycle === 1) {
                        result.push(amp * -1.0);
                    } else {
                        result.push(0.0);
                    }
                }
                break;

            default:
                break;
        }

        return result;
    }
};
