export function autoCorrelate (buf, sampleRate) {
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
    if (rms < 0.08) //not enough signal
        return -1

    let lastCorrelation = 1;
    for (let offset = 0; offset < max_samples; offset++) {
        let correlation = 0;

        for (let i = 0; i < max_samples; i++) {
            correlation += Math.abs((buf[ i ]) - (buf[ i + offset ]));
        }

        correlation = 1 - (correlation / max_samples);
        correlations[ offset ] = correlation;
        if ((correlation > 0.95) && (correlation > lastCorrelation)) { // this is the "bar" for how close a correlation needs to be
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
        //console.log("f = " + sampleRate / best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
        return sampleRate / best_offset;
    }
    return -1;
}