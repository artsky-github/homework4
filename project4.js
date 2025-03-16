"use strict";
let canvas, gl, program;

let objects = [];
let objPositions = [];
let objNormals = [];
let objTexcoords = [];
let objIndices = [];

let selectedCar = 0;
let thetaLoc;
let uViewMatrixLoc;

let cameraTheta = 0.0; // Camera angle around the y-axis
let panDirection = 0; // Camera panning direction, -1: left, 1: right, 0: none

const CAMERA_HEIGHT = 0; // Height of the camera above the ground
const CAMERA_PAN_SPEED = 0.1; // Camera panning speed
const CAMERA_RADIUS = 0.1; // Camera distance from the center
const SCALE_DOWN = 10; // Scale down the 3D models
const NUM_CARS = 20;
const WHEEL_INDEX = 1;
const CAR_TOP_INDEX = 5; // Top vertex of the car model, used as anchor for rotating
const ROTATION_SPEED = 0.02; // Rotation speed of the wheel
const SELECTED_ROTATION_SPEED = 0.5; // Rotation speed of the selected car

// ============================================
//  TODO: Initialize objects
// ============================================
window.onload = async function init() {
    setUpWebGL();

    // const matrixUniform = gl.getUniformLocation(program, "u_matrix");
    // const scale = 0.12;
    // const transformationMatrix = new Float32Array([
    //     scale,
    //     0.0,
    //     0.0,
    //     0.0,
    //     0.0,
    //     scale,
    //     0.0,
    //     0.0,
    //     0.0,
    //     0.0,
    //     scale,
    //     0.0,
    //     0.0,
    //     0.0,
    //     0.0,
    //     1.0,
    // ]);
    // console.log(transformationMatrix);

    thetaLoc = gl.getUniformLocation(program, "uTheta");
    uViewMatrixLoc = gl.getUniformLocation(program, "uViewMatrix");

    // TODO: store geometry objects inside `objects`
    // Define the vertices
    //
    // [3D models ver.]
    // - Load OBJ files with `loadOBJ()`
    // - Translate objects to center ferris wheel on screen
    // e.g let center = objects[WHEEL_INDEX].getCenter();
    const wheelBase = await loadOBJ("./models/wheel_base.obj");
    const wheelCar = await loadOBJ("./models/wheel_car.obj");
    const wheelSkeleton = await loadOBJ("./models/wheel_skeleton.obj");

    objects.push(wheelBase);
    objects.push(wheelSkeleton);
    objects.push(wheelCar);


    let center = wheelSkeleton.getCenter();
    // transformationMatrix[13] = -center[1] * 1.35;
    // console.log(transformationMatrix);
    // gl.uniformMatrix4fv(matrixUniform, false, transformationMatrix);
    console.log(center);

    //setUpUI();

    // render loop
    render();
};

// =============================
//  Setup & Configuration
// =============================
function setUpWebGL() {
    canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("WebGL 2.0 isn't available");
    }
    // WebGL config
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // Load and use shader program
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
}

function setUpUI() {
    // Color selected car to be blue
    let initialCarObj = objects[WHEEL_INDEX + 1 + selectedCar];
    for (let i = 0; i < initialCarObj.colors.length; i += 1) {
        initialCarObj.colors[i] = vec4(0.0, 0.0, 1.0, 1.0);
    }

    let handleCarChange = (oldSelectedCar, newSelectedCar) => {
        let newCarObj = objects[WHEEL_INDEX + 1 + newSelectedCar];
        for (let i = 0; i < newCarObj.colors.length; i += 1) {
            newCarObj.colors[i] = vec4(0.0, 0.0, 1.0, 1.0);
        }

        let oldCarObj = objects[WHEEL_INDEX + 1 + oldSelectedCar];
        for (let i = 0; i < oldCarObj.colors.length; i += 1) {
            oldCarObj.colors[i] = vec4(1.0, 0.0, 0.0, 1.0);
        }
    };

    // Initialize event handlers
    document.getElementById("prevCar").onclick = () => {
        let oldSelectedCar = selectedCar;
        selectedCar = (((selectedCar - 1) % NUM_CARS) + NUM_CARS) % NUM_CARS;
        handleCarChange(oldSelectedCar, selectedCar);
    };

    document.getElementById("nextCar").onclick = () => {
        let oldSelectedCar = selectedCar;
        selectedCar = (selectedCar + 1) % NUM_CARS;
        handleCarChange(oldSelectedCar, selectedCar);
    };

    document.getElementById("panLeft").onclick = () => {
        panDirection = -1;
    };

    document.getElementById("panRight").onclick = () => {
        panDirection = 1;
    };

    document.getElementById("panStop").onclick = () => {
        panDirection = 0;
    };

    document.getElementById("panReset").onclick = () => {
        panDirection = 0;
        cameraTheta = 0;
    };
}

// ======================================
//  TODO: Load OBJ [3D models ver. only]
// ======================================
function loadOBJ(src) {
    objPositions = [];
    objNormals = [];
    objTexcoords = [];
    objIndices = [];

    return new Promise(function (resolve) {
        let xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                // TODO: parse OBJ
                const lines = xhr.response.split("\n");
                for (const line of lines) {
                    const parts = line.split(" ");
                    if (parts[0] === "v") {
                        // Parse vertex positions
                        objPositions.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
                    } else if (parts[0] === "vn") {
                        // Parse normal vertices
                        objNormals.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
                    } else if (parts[0] === "vt") {
                        // Parse texture coordinates vertices
                        objTexcoords.push(parseFloat(parts[1], parseFloat(parts[2])));
                    } else if (parts[0] === "f") {
                        for (let i = 1; i <= 3; i++) {
                            // Assuming triangles
                            const vertexIndex = parseInt(parts[i]) - 1; // Convert 1-based index to 0-based
                            if (vertexIndex < 0 || vertexIndex >= objPositions.length / 3) {
                                // Prevent out-of-bounds access
                                console.error("Invalid index found:", vertexIndex);
                                continue;
                            }
                            objIndices.push(vertexIndex);
                        }
                    }
                }
                console.log(`Current Object SRC: ${src}`);
                console.log(`Total Vertices: ${objPositions.length / 3}`);
                // color red for each vertex
                const objColors = new Array(objPositions.length).fill('').map((x, xIndex) => { return xIndex % 3 === 0 ? 1 : 0});

               
                resolve(new GeometryObject(objPositions, objIndices, objNormals, objColors));
            } 
        };
        xhr.open("GET", src, true);
        xhr.send(null);
    });
}

// =================================
//  TODO: Load geometry data to GPU
// =================================
class GeometryObject {
    constructor(positionsArray, indicesArray, normalsArray, colorsArray) {
        this.positions = positionsArray;
        this.indices = indicesArray;
        this.normals = normalsArray;
        this.colors = colorsArray;
        this.theta = [0, 0, 0];

        this.cBuffer = null;
        this.vBuffer = null;
        this.iBuffer = null;
    }

        loadDataToGPU() {
            // TODO: Load color ("a_color") and position ("a_position") data to GPU

            // Position buffer
            this.vBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positions), gl.STATIC_DRAW);
    
            // Get the attribute location for position and enable it
            const aPositionLoc = gl.getAttribLocation(program, "a_position");
            gl.vertexAttribPointer(aPositionLoc, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(aPositionLoc);

            // Color buffer
            this.cBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.cBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.STATIC_DRAW);

            // Index buffer
            this.iBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);

            // Get the attribute location for color and enable it
            const aColorLoc = gl.getAttribLocation(program, "a_color");
            gl.vertexAttribPointer(aColorLoc, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(aColorLoc);

        }

    // Computes the average center (x, y, z) for all vertices
    getCenter() {
        let center = [0, 0, 0];
        for (let i = 0; i < this.positions.length; i += 4) {
            center[0] += this.positions[i];
            center[1] += this.positions[i + 1];
            center[2] += this.positions[i + 2];
        }
        center[0] /= this.positions.length;
        center[1] /= this.positions.length;
        center[2] /= this.positions.length;
        return center;
    }
}

// ============================================
//  TODO: Update the rotation while rendering
// ============================================
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // [3D version] TODO: Update camera "panning" with lookAt(eye, at, up)

    objects.forEach((object) => {
        object.loadDataToGPU();
        //gl.uniform3fv(thetaLoc, object.theta);
        //gl.drawArrays(gl.TRIANGLES, 0, object.positions.length / 3);
        gl.drawElements(
            gl.LINES,
            object.indices.length,
            gl.UNSIGNED_SHORT,
            0
        );
    });

    // TODO: Rotate ferris wheel with cars attached and rotate selected car

    // STEP 1: Rotate wheel of ferris wheel with ROTATION_SPEED
    // The angle is controlled by geometryObject.theta

    // STEP 2: Rotate all cars along with the ferris wheel with ROTATION_SPEED

    // STEP 3: Rotate the selected car with SELECTED_ROTATION_SPEED
    // which is faster than ROTATION_SPEED

   requestAnimationFrame(render);
}
