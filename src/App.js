import React, { Component } from 'react';
import './App.css';
import { ReactMic } from 'react-mic';
import { Button } from 'semantic-ui-react';

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
            noteNames: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
            good_enough_correlation: 0.9 // this is the "bar" for how close a correlation needs to be
        }
    }

    startRecording = () => {
        let audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // exposes frequency data on stream
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

        for (let i = 0; i < size; i++) {
            let val = buf[ i ];
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
                let shift = (correlations[ best_offset + 1 ] - correlations[ best_offset - 1 ]) / correlations[ best_offset ];
                return sampleRate / (best_offset = (8 * shift))
            }
            lastCorrelation = correlation;
        }

        if (best_correlation > 0.01) {
            console.log("f = " + sampleRate / best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
            return sampleRate / best_offset;
        }
        return -1;
    }

    updatePitch = () => {
        //copy waveform data into a Float32Array
        this.state.analyzer.getFloatTimeDomainData(this.state.buf);
        let pitch = this.autoCorrelate(this.state.buf, this.state.audioContext.sampleRate);

        if (pitch === -1) {
            //sound is too soft to process
        } else {
            let note = this.noteFromPitch(pitch)
            let noteName = this.state.noteNames[note % 12]
            console.log(noteName)
        }
    }

    noteFromPitch = (frequency) => {
        let noteNum = 12 * (Math.log(frequency / 440) / Math.log(2))
        return Math.round( noteNum ) + 69;
    }

    onStop(recordedBlob) {

    }

    render() {
        return (
            <React.Fragment>
                <div style={{ display: '' }}>
                    <ReactMic
                        record={this.state.record}
                        className="sound-wave"
                        onStop={this.onStop}
                        onData={this.onData}
                        strokeColor="#000000"
                        backgroundColor="#fff"/>
                </div>

                <Button primary onClick={this.startRecording}>Start</Button>
                <Button secondary onClick={this.stopRecording}>Stop</Button>

            </React.Fragment>
        );
    }
}

export default App;
