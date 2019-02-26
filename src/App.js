import React, { Component } from 'react';
import './App.css';
import { ReactMic } from 'react-mic';
import { Button, Menu, Container } from 'semantic-ui-react';
import { autoCorrelate } from './algorithm';

class App extends Component {
    /* Original author
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
            noteNames: [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ],
            noteName: '-',
            noteToPlay: null,
        }
    }

    startRecording = () => {
        this.getRandomNote();
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
            record: false,
            noteName: '-',
            noteToPlay: '- '
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

    updatePitch = () => {
        //copy waveform data into a Float32Array
        this.state.analyzer.getFloatTimeDomainData(this.state.buf);
        let pitch = autoCorrelate(this.state.buf, this.state.audioContext.sampleRate);

        if (pitch === -1) {
            //sound is too soft to process
        } else {
            let note = this.noteFromPitch(pitch)
            let noteName = this.state.noteNames[ note % 12 ]
            if (noteName) {
                this.setState({ noteName: noteName })
            }
        }
    }

    noteFromPitch = (frequency) => {
        let noteNum = 12 * (Math.log(frequency / 440) / Math.log(2))
        return Math.round(noteNum) + 69;
    }

    onStop = (recordedBlob) => {}

    getRandomNote = () => {
        let noteToPlay = this.state.noteNames[ Math.floor(Math.random() * 11) ]
        this.setState({ noteToPlay: noteToPlay })
    }


    render() {
        return (
            <React.Fragment>
                <Menu
                    borderless
                    style={{ marginBottom: '5em' }}
                >
                    <Menu.Item header>Musr</Menu.Item>
                </Menu>
                <Container text>
                    {/* Mic */}
                    <div style={{ display: 'none' }}>
                        <ReactMic
                            record={this.state.record}
                            className="sound-wave"
                            onStop={this.onStop}
                            onData={this.onData}
                            strokeColor="#000000"
                            backgroundColor="#fff"/>
                    </div>

                    <h1>{this.state.noteName}</h1>

                    <Button primary onClick={this.startRecording}>Start</Button>
                    <Button secondary onClick={this.stopRecording}>Stop</Button>

                    {/* Allow user to toggle new note */}
                    {this.state.noteToPlay &&
                        <div>
                            <br/>
                            <Button primary onClick={this.getRandomNote}>New note</Button>
                            <h1>Play {this.state.noteToPlay}</h1>
                        </div>
                    }

                    {/* If note played matches note prompt show good job message */}
                    {this.state.noteToPlay === this.state.noteName &&
                        <h1>Nice</h1>
                    }
                </Container>
            </React.Fragment>
        );
    }
}

export default App;
