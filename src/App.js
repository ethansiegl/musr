import React, { Component } from 'react';
import './App.css';
import { ReactMic } from 'react-mic';
import { Button, Menu, Container, Icon } from 'semantic-ui-react';
import { note_freqs } from './note_freqs';

class App extends Component {
  constructor (props) {
    super(props);
    this.state = {
      record: false,
      context: null,
      analyzer: null,
      freeze: null,
      mediaStreamSource: null,
      buf: null,
      buf2: null,
      noteInput: '-',
      isCorrect: false,
      noteToPlay: null,
      fourierOutputArr: null,
      overtones: []
    };
  }

  startRecording = () => {
    this.getRandomNote();
    let audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // exposes frequency data on stream
    let analyser = audioContext.createAnalyser();
    analyser.fftSize = 4096;

    this.setState({
      record: true,
      buf: new Float32Array(analyser.fftSize),
      buf2: new Uint8Array(analyser.fftSize),
      audioContext: audioContext,
      analyzer: analyser
    });
  };

  stopRecording = () => {
    this.setState({
      record: false,
      noteInput: this.state.noteInput,
      noteToPlay: this.state.noteToPlay,
      overtones: []
    });
  };

  onData = (recordedBlob) => {
    const constraints = { audio: true };

    if (this.state.record) {
      window.navigator.mediaDevices.getUserMedia(constraints).then(mediaStream => {
        let mediaStreamSource = this.state.audioContext.createMediaStreamSource(mediaStream);
        mediaStreamSource.connect(this.state.analyzer);
        this.updatePitch();
      });
    }
  };

  fourier = (in_array) => {
    /* This is a very slow implementation */
    let len = in_array.length;
    let output = [];

    for (let k = 0; k < len; k++) {
      let real = 0;
      let imag = 0;
      for (let n = 0; n < len; n++) {
        real += in_array[n] * Math.cos(-2 * Math.PI * k * n / len);
        imag += in_array[n] * Math.sin(-2 * Math.PI * k * n / len);
      }

      //get average
      let real_sq = real * real;
      let imag_sq = imag * imag;
      let sum = real_sq + imag_sq;

      let average = Math.sqrt(sum);

      output.push(average);
    }
    return output;
  };

  getRandomNote = () => {
    let notes = Object.keys(note_freqs);
    let randomNote = notes[Math.floor(Math.random() * 35) + 1];
    this.setState({ noteToPlay: randomNote, record: true, isCorrect: false, noteInput: '-' });
  };

  updatePitch = () => {
    //TODO
    //map fundamental to pitch - DONE
    //get fundamental pitch from series of overtones more reliably

    //copy waveform data into a Float32Array
    this.state.analyzer.getFloatTimeDomainData(this.state.buf);
    //this.state.analyzer.getByteFrequencyData(this.state.buf2);

    let output = this.fourier(this.state.buf);
    this.setState({ fourierOutputArr: output });

    let frequency = this.getFrequency();

    let overtones = this.state.overtones;
    if (!overtones.includes(frequency) && frequency > 0) {
      overtones.push(frequency);
    }

    //todo don't store frequencies below lowest pitch
    overtones = overtones.sort(function (a, b) {return a - b;});
    // let fundamental = overtones[0];

    let note = this.noteFromFrequency(overtones);

    this.setState({ noteInput: note });

  };

  getFrequency = () => {
    let sampleRate = 44100;
    let nyquist = sampleRate / 2;
    let spectrum = this.state.fourierOutputArr;
    let numberOfBins = spectrum.length;
    let maxAmp = 0;
    let largestBin;

    for (let i = 0; i < numberOfBins; i++) {
      let thisAmp = spectrum[i];    // amplitude of current bin
      if (thisAmp < 0.7) {          //threshold
        continue;
      }

      if (thisAmp > maxAmp) {
        maxAmp = thisAmp;
        largestBin = i;
      }
    }

    let loudestFreq = largestBin * (nyquist / numberOfBins);
    return Math.round(loudestFreq);
  };


  noteFromFrequency = (overtones) => {
    console.log(overtones);
    console.log('note to play: ', this.state.noteToPlay);
    console.log('frequency to play: ', note_freqs[this.state.noteToPlay]);
    console.log('min: ', note_freqs[this.state.noteToPlay] - 20);
    console.log('max: ', note_freqs[this.state.noteToPlay] + 20);

    let buffer = 20;
    for (let frequency in overtones) {
      let min = note_freqs[this.state.noteToPlay] - buffer;
      let max = note_freqs[this.state.noteToPlay] + buffer;
      let freq = overtones[frequency];
      if (freq > min && freq < max) {
        this.setState({ record: false, inputNote: '-', noteToPlay: '-', isCorrect: true });
      }
    }
  }

  render () {
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
            <ReactMic record={this.state.record}
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
