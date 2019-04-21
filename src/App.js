import React, { Component } from 'react';
import './App.css';
import { ReactMic } from 'react-mic';
import { Button, Menu, Container, Icon } from 'semantic-ui-react';


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
      noteNames: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
      noteInput: '-',
      isCorrect: false,
      noteToPlay: null,
      fourierOutputArr: null
    };
  }

  componentDidUpdate = () => {
    if (this.state.noteToPlay === this.state.noteInput) {
      this.setState({ record: false, inputNote: '-', noteToPlay: '-', isCorrect: true });
    }
  };

  startRecording = () => {
    this.getRandomNote();
    let audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // exposes frequency data on stream
    let analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

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
      output.push([real, imag]);
    }
    return output;
  };


  getFrequency = () => {
    let sampleRate = 44100;
    let nyquist = sampleRate / 2;
    let spectrum = this.state.fourierOutputArr;
    let numberOfBins = spectrum.length;
    let maxAmp = 0;
    let largestBin;

    for (let i = 0; i < numberOfBins; i++) {
      let thisAmp = spectrum[i]; // amplitude of current bin
      if (thisAmp > maxAmp) {
        maxAmp = thisAmp;
        largestBin = i;
      }
    }

    let loudestFreq = largestBin * (nyquist / numberOfBins);
    return loudestFreq;

  };

  updatePitch = () => {
    //TODO
    //set this.state.buf to be stream of audio data - DONE
    //push it through a fourier transform to get the frequency data - DONE
    //get loudest frequency - DONE
    //map frequency to pitch
    //continue with logic

    //copy waveform data into a Float32Array
    this.state.analyzer.getFloatTimeDomainData(this.state.buf);
    //this.state.analyzer.getByteFrequencyData(this.state.buf2);
    //this.state.analyzer.getFloatFrequencyData(this.state.buf);

    let output = this.fourier(this.state.buf);

    //get sq root of square of each val
    let outArr = [];
    output.map((arr) => {
      let out = null;
      arr.map((num) => {
        out += (num * num);
      });
      out = Math.sqrt(out);
      outArr.push(out);
      out = null;
    });

    this.setState({ fourierOutputArr: outArr });

    let frequency = this.getFrequency();
    console.log(frequency);

    // let pitch = autoCorrelate(this.state.buf, this.state.audioContext.sampleRate);
    // let pitch = this.getFrequency();
    //
    // if (pitch === -1) {
    //   //sound is too soft to process
    // } else {
    //   let note = this.noteFromPitch(pitch);
    //   let noteName = this.state.noteNames[note % 12];
    //   if (noteName) {
    //     this.setState({ noteInput: noteName });
    //   }
    // }
  };

  noteFromPitch = (frequency) => {
    let noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    return Math.round(noteNum) + 69;
  };

  getRandomNote = () => {
    let noteToPlay = this.state.noteNames[Math.floor(Math.random() * 11)];
    this.setState({ noteToPlay: noteToPlay, record: true, isCorrect: false, noteInput: '-' });
  };

  render () {
    return (
      <React.Fragment>
        {/* Header */}
        <Menu borderless style={{ marginBottom: '2em' }}>
          <Menu.Item header><Icon name='music' size='large'/></Menu.Item>
          <Menu.Item header>Musr</Menu.Item>
        </Menu>

        <Container text>
          <Button primary onClick={this.startRecording}>Start</Button>
          <Button secondary onClick={this.stopRecording}>Stop</Button>

          {/* Mic */}
          <div style={{ display: '' }}>
            <ReactMic record={this.state.record} onData={this.onData}/>
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

          {/*<Plot*/}
          {/*data={[*/}
          {/*{*/}
          {/*x: [1, 2, 3],*/}
          {/*y: [2, 6, 3],*/}
          {/*mode: 'line',*/}
          {/*marker: {color: 'red'},*/}
          {/*},*/}
          {/*]}*/}
          {/*layout={ {width: 920, height: 640, title: ''} }*/}
          {/*/>*/}

        </Container>
      </React.Fragment>
    );
  }
}

export default App;
