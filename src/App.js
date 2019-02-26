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
            freeze: null,
            mediaStreamSource: null,
            buf: new Float32Array(1024),
            noteNames: [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ],
            noteInput: '-',
            isCorrect: false,
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
            noteInput: this.state.noteInput,
            noteToPlay: this.state.noteToPlay,
        });
    }

    onData = (recordedBlob) => {
        const constraints = { audio: true };

        if (this.state.record) {
            window.navigator.mediaDevices.getUserMedia(constraints).then(mediaStream => {
                let mediaStreamSource = this.state.audioContext.createMediaStreamSource(mediaStream);
                mediaStreamSource.connect(this.state.analyzer);
                this.updatePitch();
            })
        }
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
                this.setState({ noteInput: noteName })
            }
        }
    }

    noteFromPitch = (frequency) => {
        let noteNum = 12 * (Math.log(frequency / 440) / Math.log(2))
        return Math.round(noteNum) + 69;
    }

    onStop = (recordedBlob) => {
    }

    getRandomNote = () => {
        let noteToPlay = this.state.noteNames[ Math.floor(Math.random() * 11) ]
        this.setState({ noteToPlay: noteToPlay, record: true, isCorrect: false })
    }

    isPlayedNoteCorrect = () => {
        if (this.state.noteToPlay === this.state.noteInput) {
            this.stopRecording()
            //return
        }
    }

    componentDidUpdate = () => {
        if (this.state.noteToPlay === this.state.noteInput) {
            this.setState({ record: false, inputNote: '-', noteToPlay: '-', isCorrect: true })
        }
    }


    render() {
        return (
            <React.Fragment>
                {/* Header */}
                <Menu borderless style={{ marginBottom: '2em' }}>
                    <Menu.Item header>Musr</Menu.Item>
                </Menu>

                <Container text>
                    <Button primary onClick={this.startRecording}>Start</Button>
                    <Button secondary onClick={this.stopRecording}>Stop</Button>

                    {/* Mic */}
                    <div style={{ display: 'none' }}>
                        <ReactMic
                            record={this.state.record}
                            onStop={this.onStop}
                            onData={this.onData}/>
                    </div>

                    <h1>{this.state.noteInput}</h1>

                    {/* Allow user to toggle new note */}
                    {this.state.record &&
                    <div>
                        <br/>
                        <h1>Play {this.state.noteToPlay}</h1>
                    </div>
                    }

                    {this.state.isCorrect &&
                    <div>
                        <Button primary onClick={this.getRandomNote}>New note</Button>
                        <h1>Good job!</h1>
                    </div>
                    }

                </Container>
            </React.Fragment>
        );
    }
}

export default App;
