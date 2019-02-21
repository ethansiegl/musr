import React, { Component } from 'react';
import './App.css';
import { ReactMic } from 'react-mic';

class App extends Component {
    /* Originally author
    * https://github.com/cwilso/pitchdetect
    * */
    constructor(props) {
        super(props);
        this.state = {
            record: false,
            context: null,
            analyzer: null,
            mediaStreamSource: null,
            buf: new Float32Array(1024),
            minSamples: 0,
            ac: null,
            good_enough_correlation: 0.9 // this is the "bar" for how close a correlation needs to be
        }
    }

    startRecording = () => {
        let audioContext = new (window.AudioContext || window.webkitAudioContext)();
        let analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 2048;

        this.setState({
            record: true,
            audioContext: audioContext,
            analyzer: analyzer
        });
    }

    stopRecording = () => {
        this.setState({
            record: false
        });
    }

    onData = (recordedBlob) => {
        console.log('chunk of real-time data is: ', recordedBlob);

        const constraints = { audio: true };
        window.navigator.mediaDevices.getUserMedia(constraints).then(mediaStream => {
            let mediaStreamSource = this.state.audioContext.createMediaStreamSource(mediaStream);
            mediaStreamSource.connect(this.state.analyzer);
            this.updatePitch()
        })
    }

    autoCorrelate = (buf, sampleRate) => {
        let size = buf.length;
        let max_samples = Math.floor(size / 2);
        let best_offset = -1;
        let best_correlation = 0;
        let rms = 0;
        let foundGoodCorrelation = false;
        let correlations = new Array(max_samples);

        for (var i = 0; i < size; i++) {
            var val = buf[ i ];
            rms += val * val;
        }

        rms = Math.sqrt(rms / size);
        if (rms < 0.01) //not enough signal
            return -1

        let lastCorrelation = 1;
        for (let offset = this.state.minSamples; offset < max_samples; offset++) {
            let correlation = 0;

            for (let i = 0; i < max_samples; i++) {
                correlation += Math.abs((buf[ i ]) - (buf[ i + offset ]));
            }

            correlation = 1 - (correlation / max_samples);
            correlations[ offset ] = correlation;
            if ((correlation > this.state.good_enough_correlation) && (correlation > lastCorrelation)) {
                foundGoodCorrelation = true;
                if (correlation > best_correlation) {
                    best_correlation = correlation;
                    best_offset = offset;
                }
            } else if (foundGoodCorrelation) {
                // short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
                // Now we need to tweak the offset - by interpolating between the values to the left and right of the
                // best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
                // we need to do a curve fit on correlations[] around best_offset in order to better determine precise
                // (anti-aliased) offset.

                // we know best_offset >=1,
                // since foundGoodCorrelation cannot go to true until the second pass (offset=1), and
                // we can't drop into this clause until the following pass (else if).
                let shift = (correlation[ best_offset + 1 ] - correlation[ best_offset - 1 ]) / correlation[ best_offset ];
                return sampleRate / (best_offset = (8 * shift))
            }
            lastCorrelation = correlation;
        }

        if (best_correlation > 0.01) {
            console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
            return sampleRate / best_offset;
        }
        return -1;
    }

    updatePitch = () => {
        this.state.analyzer.getFloatTimeDomainData(this.state.buf);
        let autocorrelate = this.autoCorrelate(this.state.buf, this.state.audioContext.sampleRate);
        this.setState({ac: autocorrelate})
        console.log(this.state.ac)
    }

    onStop(recordedBlob) {

    }

    render() {
        return (
            <div>
                <ReactMic
                    record={this.state.record}
                    className="sound-wave"
                    onStop={this.onStop}
                    onData={this.onData}
                    strokeColor="#000000"
                    backgroundColor="#FF4081"/>
                <button onClick={this.startRecording} type="button">Start</button>
                <button onClick={this.stopRecording} type="button">Stop</button>
            </div>
        );
    }
}

export default App;
