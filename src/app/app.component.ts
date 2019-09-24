import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import * as THREE from 'three';
import * as Stats from 'stats-js';
import { CountUp } from 'countup.js';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.styl'],
})
export class AppComponent {
  @ViewChild('rendererContainer', {static: false}) rendererContainer: ElementRef;

  renderer = new THREE.WebGLRenderer();
  sceneWidth: number;
  sceneHeight: number;
  camera: any;
  scene: any;
  dom: any;
  sun: any
  ground: any;
  offense: boolean;
  rollingGroundSphere: any;
  goalShot: boolean = false;
  goalTimer: number = 5;
  goalMeter: boolean = false;
  goalMeterSpeed: string = '1s';
  goalStatus: string = '';
  goalLinedUp: boolean = false;
  goalKeeper: boolean;
  goalMiniGame: boolean = false;
  rotationStop = false;
  meterStop: boolean = false;
  possessionTextStatus: string;
  possessionChange: boolean = false;
  turnover: boolean = false;
  countdownTime: number = 3;
  goText: boolean;
  handleCountdown;
  goalCountdownInterval;
  goalCountdown;
  goalPrepMessage: boolean = false;
  randomOpponentDirection;
  heroSphere: any;
  ballPositionZ: number;
  rollingSpeed=0.008;
  heroRollingSpeed;
  worldRadius=26;
  heroRadius=0.2;
  sphericalHelper;
  pathAngleValues;
  heroBaseY;
  bounceValue=0.1;
  gravity=0.005;
  leftLane=-1;
  rightLane=1;
  middleLane=0;
  currentLane;
  clock;
  jumping;
  treeReleaseInterval=0.5;
  lastTreeReleaseTime=0;
  conesInPath;
  conesPool;
  particleGeometry;
  particleCount=20;
  explosionPower=1.06;
  particles;
  stats: Stats;
  scoreText;
  timerRunning;
  countUp: any;
  possessionCountDown;
  timeLimitReached: boolean;
  goalTimeUp: boolean;
  hasCollided;
  swipeDirection;
  currentShots: number;
  totalShots: number = 10;
  goaltimerVisible: boolean = false;
  infoText: any = document.createElement('div');
  private swipeCoord?: [number, number];
  private swipeTime?: number;
  private homeDataModelSubscription;
  constructor( ) {
    this.createScene();
    //this.update();
   }
              
  swipe(e: TouchEvent, when: string): void {
    const coord: [number, number] = [e.changedTouches[0].clientX, e.changedTouches[0].clientY];
    const time = new Date().getTime();
  
    if (when === 'start') {
      this.swipeCoord = coord;
      this.swipeTime = time;
    } else if (when === 'end') {
      const direction = [coord[0] - this.swipeCoord[0], coord[1] - this.swipeCoord[1]];
      const duration = time - this.swipeTime;
  
      if (duration < 1000 && this.offense && !this.goalShot ) { 
        if( Math.abs(direction[0]) > 30 && Math.abs(direction[0]) > Math.abs(direction[1] * 3) ) {
          this.swipeDirection = direction[0] < 0 ? 'left' : 'right';
        } else {
          this.swipeDirection = 'tap';
        }
        this.handleSwipe(this.swipeDirection);
      }
  }
}
  ngOnInit() {
  }

  ngAfterViewInit() {
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);
    this.countUp = new CountUp(
      'scoreText',
      this.goalTimer,
      {startVal: 0, useEasing: false, duration: this.goalTimer}
    );
    this.countUp.start(()=> {
      this.timeLimitReached = true;
    });

    this.possessionCountDown = new CountUp(
      'possessionCountdown',
      1,
      {startVal: 3, useEasing: false, duration: 3}
    );

    this.goalCountdown = new CountUp(
      'goalCountdown',
      0,
      {startVal: 3, useEasing: false, duration: 3}
    );
    
    //call game loop
    this.update();
  }
  clearScene(){
    var to_remove = [];

    this.scene.traverse ( function( child ) {
      if ( child instanceof THREE.Mesh || child instanceof THREE.Geometry || child instanceof THREE.Material || child instanceof THREE.Points || child instanceof THREE.PointsMaterial ) {
          to_remove.push( child );
        }
    } );

    for ( var i = 0; i < to_remove.length; i++ ) {
      this.scene.remove( to_remove[i] );
    }
  }
  clearCones() {
    this.conesInPath=[];
    this.conesPool=[];
    var to_remove = [];

    this.rollingGroundSphere.traverse( function( child ) {
      to_remove.push(child)
    });

    for ( var i = 0; i < to_remove.length; i++ ) {
      this.rollingGroundSphere.remove( to_remove[i] );
    }
  }
  
  createScene(){
    this.stats = new Stats();
    //this.stats.showPanel( 1 ); // 0: fps, 1: ms, 2: mb, 3+: custom
    //document.body.appendChild( this.stats.domElement );
    this.hasCollided=false;
    this.offense = true;
    this.timerRunning = true;
    this.goalKeeper = false;
    this.timeLimitReached = false;
    this.clock=new THREE.Clock();
    this.clock.start();
    this.heroRollingSpeed=(this.rollingSpeed*this.worldRadius/this.heroRadius)/5;
    this.sphericalHelper = new THREE.Spherical();
    this.pathAngleValues=[1.52,1.57,1.62];
    this.sceneWidth=window.innerWidth;
    this.sceneHeight=window.innerHeight;
    this.scene = new THREE.Scene();//the 3d scene
    this.scene.background = new THREE.Color( 0x35a2d5 );
    this.camera = new THREE.PerspectiveCamera( 90, this.sceneWidth / this.sceneHeight, 0.1, 1000 );//perspective camera
    this.renderer = new THREE.WebGLRenderer();//renderer with transparent backdrop
    this.renderer.setClearColor(0xfffafa, 1); 
    this.renderer.shadowMap.enabled = true;//enable shadow
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize( this.sceneWidth, this.sceneHeight );
    this.addLight();
    this.createWorld();
    
    this.camera.position.z = 8;
    this.camera.position.y = 3;
    /*orbitControl = new THREE.OrbitControls( camera, renderer.domElement );//helper to rotate around in scene
    orbitControl.addEventListener( 'change', render );
    orbitControl.noKeys = true;
    orbitControl.noPan = true;
    orbitControl.enableZoom = false;
    orbitControl.minPolarAngle = 1.1;
    orbitControl.maxPolarAngle = 1.1;
    orbitControl.minAzimuthAngle = -0.2;
    orbitControl.maxAzimuthAngle = 0.2;
    */
    window.addEventListener('resize', this.onWindowResize, false);//resize callback

  }
  createWorld() {
    this.hasCollided=false;
    this.goalShot = false;
    this.conesInPath=[];
    this.conesPool=[];
    this.heroBaseY = (this.offense) ? 1.92 : 2.15;
    this.ballPositionZ = (this.offense) ? 5.5 : 2.6;
    this.currentShots = this.totalShots;
    this.addWorld();
    this.addHero();
    this.addExplosion();
    this.createConesPool();
  }
  addExplosion(){
    this.particleGeometry = new THREE.Geometry();
    for (var i = 0; i < this.particleCount; i ++ ) {
      var vertex = new THREE.Vector3();
      this.particleGeometry.vertices.push( vertex );
    }
    var pMaterial = new THREE.PointsMaterial({
      color: 0xd5a035,
      size: 0.2
    });
    this.particles = new THREE.Points( this.particleGeometry, pMaterial );
    this.scene.add( this.particles );
    this.particles.visible=false;
  }
  createConesPool(){
    var maxTreesInPool= 40;
    var newTree;
    for(var i=0; i<maxTreesInPool;i++){
      newTree= this.createCone();
      this.conesPool.push(newTree);
    }
  }
  getRandomTapDirection() {
    var randNum = Math.floor(Math.random() * 3) + 1;
    var tapValue = '';
    if(randNum === 1) {
      tapValue = 'right';
    } else if (randNum === 2) {
      tapValue = 'left';
    } else {
      tapValue = 'tap';
    }
    return tapValue
  }
  handleSwipe(swipeDirection) {
    if(this.jumping)return;
    var validMove=true;
    if ( swipeDirection === 'left') {//left
      if(this.currentLane==this.middleLane){
        this.currentLane=this.leftLane;
      }else if(this.currentLane==this.rightLane){
        this.currentLane=this.middleLane;
      }else{
        validMove=false;	
      }
    } else if ( swipeDirection === 'right') {//right
      if(this.currentLane==this.middleLane){
        this.currentLane=this.rightLane;
      }else if(this.currentLane==this.leftLane){
        this.currentLane=this.middleLane;
      }else{
        validMove=false;	
      }
    }else{
      if ( swipeDirection === 'tap'){//up, jump
        this.bounceValue=0.1;
        this.jumping=true;
      }
      validMove=false;
    }
    //heroSphere.position.x=currentLane;
    if(validMove){
      this.jumping=true;
      this.bounceValue=0.06;
    }
  }
  handleGoalCountdown() {
    this.goaltimerVisible = true;
    this.goalCountdown.start(()=>{
      this.handleGoalTimer();
    });
  }
  handleGoalDirection() {
    this.rotationStop = true;
    this.goalLinedUp = true;
  }
  handleGoalPower() {
    this.meterStop = true;
    var meterAccuracy = this.getMeterAccuracy();
    this.ballPositionZ = -1;
    this.goalStatus = this.goalChance(meterAccuracy);
    this.goalCountdown.pauseResume();
    this.goalMiniGame = false;
    this.goaltimerVisible = false;
    setTimeout(() => {
      this.goalShot = false;
      this.goalStatus = '';
      this.meterStop = false;
      this.goalMeter = false;
      this.goalLinedUp = false;
      this.rotationStop = false;
      this.timerRunning = true;
      this.runGoalLogic();
    }, 2000);
  }
  tapGoal(direction: string) {
    var compDirection = this.getRandDirection();
    this.ballPositionZ = 20;
    this.goalStatus = (compDirection === direction) ? 'Goal!' : 'Blocked!';
    this.goalCountdown.pauseResume();
    this.goaltimerVisible = false;
    setTimeout(() => {
      this.goalKeeper = false;
      this.goalShot = false;
      this.goalMiniGame = false;
      this.goalStatus = '';
      this.rotationStop = false;
      this.timerRunning = true;
      this.runGoalLogic();
    }, 2000);
  }
  getRandDirection() {
    var direction;
    var randDirection = Math.floor(Math.random() * 3) + 1;
    if(randDirection === 1) {
      direction = 'left'
    } else if ( randDirection === 2 ) {
      direction = 'center';
    } else {
      direction = 'right';
    }
    return direction;
  }
  getMeterAccuracy() {
    var meter = document.getElementById('goalMeter').getBoundingClientRect();
    var meterWrapper = document.getElementById('goalMeterWrapper').getBoundingClientRect();
    var meterCenter = meterWrapper.left + ((meterWrapper.right - meterWrapper.left) / 2);
    var meterPosition = meter.left + ((meter.right - meter.left) / 2);
    var meterAccuracy = meterPosition/ meterCenter;
    return meterAccuracy;
  }
  goalChance(accuracy) {
    var rand = Math.random();
    if(accuracy >= 0.98 && accuracy <= 1.02 ) {
      return 'Goal!';
    } else if ( accuracy >= 0.95 && accuracy <= 1.05) {
      if(rand <= 0.65) {
        return 'Goal!'
      } else {
        return 'Missed!';
      }
    } else if ( accuracy >= 0.9 && accuracy <= 1.1) {
      if(rand <= 0.4) {
        return 'Goal!'
      } else {
        return 'Missed!';
      }
    } else if ( accuracy >= 0.85 && accuracy <= 1.15 ) {
      if(rand <= 0.15) {
        return 'Goal!'
      } else {
        return 'Missed!';
      }
    } else {
      return 'Missed!';
    }
  }
  addHero(){
    var sphereGeometry = new THREE.SphereGeometry( this.heroRadius, 15, 15 );
    var texture = new THREE.TextureLoader().load('assets/soccer-ball.jpeg');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set( 2, 1 );
    texture.offset.set( 15, 15 );
    var sphereMaterial = new THREE.MeshPhongMaterial({color: 0xe5f2f2, map: texture, transparent: false});
    this.jumping=false;
    this.heroSphere = new THREE.Mesh( sphereGeometry, sphereMaterial );
    this.heroSphere.receiveShadow = true;
    this.heroSphere.castShadow=true;
    this.scene.add( this.heroSphere );
    this.heroSphere.position.y = this.heroBaseY;
    this.heroSphere.position.z = this.ballPositionZ;
    this.heroSphere.rotation.z=5;
    this.currentLane=this.middleLane;
    this.heroSphere.position.x=this.currentLane;
  }
  addWorld(){
    var sides=80;
    var tiers=80;
    var texture = new THREE.TextureLoader().load('assets/tiled-grass.jpeg');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set( 20, 20 );
    var sphereGeometry = new THREE.SphereGeometry( this.worldRadius, sides,tiers);
    var sphereMaterial = new THREE.MeshLambertMaterial({
      map: texture,
      transparent: false
    });
    this.rollingGroundSphere = new THREE.Mesh( sphereGeometry, sphereMaterial );
    this.rollingGroundSphere.receiveShadow = true;
    this.rollingGroundSphere.castShadow=false;
    this.rollingGroundSphere.doubleSided=true;
    this.rollingGroundSphere.rotation.z=-Math.PI/2;
    this.scene.add( this.rollingGroundSphere );
    this.rollingGroundSphere.position.y=-24;
    this.rollingGroundSphere.position.z=2;
  }
  addLight(){
    var hemisphereLight = new THREE.HemisphereLight(0xfffafa,0x000000, .9)
    this.scene.add(hemisphereLight);
    var sun = new THREE.DirectionalLight( 0xcdc1c5, 0.9);
    sun.position.set( 12,6,-7 );
    sun.castShadow = true;
    this.scene.add(sun);
    //Set up shadow properties for the sun light
    sun.shadow.mapSize.width = 256;
    sun.shadow.mapSize.height = 256;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50 ;
  }
  addPathCone(){
    var options=[0,1,2];
    var lane= Math.floor(Math.random()*3);
    this.addCone(true,lane, false);
    options.splice(lane,1);
    if(Math.random()>0.5){
      lane= Math.floor(Math.random()*2);
      this.addCone(true,options[lane], false);
    }
  }
  addCone(inPath, row, isLeft){
    var newTree;
    if(inPath){
      if(this.conesPool.length==0)return;
      newTree=this.conesPool.pop();
      newTree.visible=true;
      //console.log("add tree");
      this.conesInPath.push(newTree);
      if( this.offense) {
        this.sphericalHelper.set( this.worldRadius-0.3, this.pathAngleValues[row], -this.rollingGroundSphere.rotation.x+4 );
      } else {
        this.sphericalHelper.set( this.worldRadius-0.3, this.pathAngleValues[row], -this.rollingGroundSphere.rotation.x+5.35  );
      }
    }else{
      newTree=this.createCone();
      var forestAreaAngle=0;//[1.52,1.57,1.62];
      if(isLeft){
        forestAreaAngle=1.68+Math.random()*0.1;
      }else{
        forestAreaAngle=1.46-Math.random()*0.1;
      }
      this.sphericalHelper.set( this.worldRadius-0.3, forestAreaAngle, row );
    }
    newTree.position.setFromSpherical( this.sphericalHelper );
    var rollingGroundVector=this.rollingGroundSphere.position.clone().normalize();
    var treeVector=newTree.position.clone().normalize();
    newTree.quaternion.setFromUnitVectors(treeVector,rollingGroundVector);
    
    this.rollingGroundSphere.add(newTree);
  }
  createCone(){
    var sides=8;
    var tiers=6;
    var midPointVector= new THREE.Vector3();
    var coneGeometry = new THREE.ConeGeometry( 0.5, 1, sides, tiers);
    midPointVector=coneGeometry.vertices[0].clone();
    var coneMaterial = new THREE.MeshLambertMaterial({color: new THREE.Color(0xff6700), flatShading: true, transparent: false});
    coneGeometry.name = 'cone';
    coneMaterial.name = 'cone';
    var coneObject = new THREE.Mesh( coneGeometry, coneMaterial );
    coneObject.position.y=0.25;
    coneObject.castShadow=true;
    coneObject.receiveShadow=false;
    var cone = new THREE.Object3D();
    cone.add(coneObject);
    coneObject.name = 'cone';
    cone.name = 'cone';
    return cone;
  }
  blowUpTree(vertices,sides,currentTier,scalarMultiplier,odd){
    var vertexIndex;
    var vertexVector= new THREE.Vector3();
    var midPointVector=vertices[0].clone();
    var offset;
    for(var i=0;i<sides;i++){
      vertexIndex=(currentTier*sides)+1;
      vertexVector=vertices[i+vertexIndex].clone();
      midPointVector.y=vertexVector.y;
      offset=vertexVector.sub(midPointVector);
      if(odd){
        if(i%2===0){
          offset.normalize().multiplyScalar(scalarMultiplier/6);
          vertices[i+vertexIndex].add(offset);
        }else{
          offset.normalize().multiplyScalar(scalarMultiplier);
          vertices[i+vertexIndex].add(offset);
          vertices[i+vertexIndex].y=vertices[i+vertexIndex+sides].y+0.05;
        }
      }else{
        if(i%2!==0){
          offset.normalize().multiplyScalar(scalarMultiplier/6);
          vertices[i+vertexIndex].add(offset);
        }else{
          offset.normalize().multiplyScalar(scalarMultiplier);
          vertices[i+vertexIndex].add(offset);
          vertices[i+vertexIndex].y=vertices[i+vertexIndex+sides].y+0.05;
        }
      }
    }
  }
  tightenTree(vertices,sides,currentTier){
    var vertexIndex;
    var vertexVector= new THREE.Vector3();
    var midPointVector=vertices[0].clone();
    var offset;
    for(var i=0;i<sides;i++){
      vertexIndex=(currentTier*sides)+1;
      vertexVector=vertices[i+vertexIndex].clone();
      midPointVector.y=vertexVector.y;
      offset=vertexVector.sub(midPointVector);
      offset.normalize().multiplyScalar(0.06);
      vertices[i+vertexIndex].sub(offset);
    }
  }

  update(){
    this.stats.update();
      //animate
      if( !this.goalShot) {
        if(this.offense) {
          this.rollingGroundSphere.rotation.x += this.rollingSpeed;
          this.heroSphere.rotation.x -= this.heroRollingSpeed;
        } else {
          this.rollingGroundSphere.rotation.x -= this.rollingSpeed;
          this.heroSphere.rotation.x += this.heroRollingSpeed;
        }
        if(this.heroSphere.position.y<=this.heroBaseY){
          this.jumping=false;
          this.bounceValue=(Math.random()*0.04)+0.005;
        }
        this.heroSphere.position.y+=this.bounceValue;
        this.heroSphere.position.x=THREE.Math.lerp(this.heroSphere.position.x,this.currentLane, 2*this.clock.getDelta());//clock.getElapsedTime());
        this.bounceValue-=this.gravity;
      }

      if(this.goalShot) {
        this.rollingGroundSphere.rotation.x += this.rollingSpeed / 10;
        this.heroSphere.rotation.x -= this.heroRollingSpeed / 10;
        this.clearCones();
        this.createConesPool();
        this.goalMiniGame = true;
      }

      if(this.offense && this.heroSphere.position.z >= this.ballPositionZ) {
        this.heroSphere.position.z -= 0.25;
      }

      if(!this.offense && this.heroSphere.position.z <= this.ballPositionZ) {
        this.heroSphere.position.z += 0.25;
      }
  
      if(this.timeLimitReached) {
        this.timerRunning = false;
        this.timeLimitReached = false;
        this.goalShot = true;
        this.goalPrepMessage = true;
        setTimeout(() => {
          this.goalPrepMessage = false;
          this.handleGoalCountdown();
          if(!this.offense) {
            this.goalKeeper = true;
          } else {
            this.goalMeter = true;
          }
        }, 1000)
      }

      if(!this.offense && !this.goalShot) {
        this.handleSwipe(this.getRandomTapDirection());
      }

      if(this.clock.getElapsedTime()>this.treeReleaseInterval){
        this.clock.start();
        console.log(this.timerRunning);
        if( !this.goalShot && this.offense && this.timerRunning) {
          this.addPathCone();
        }
        if(this.hasCollided){
          this.countUp.reset();
          this.timerRunning = false;
          this.turnover = true;
          this.offense = !this.offense;
          this.clearCones();
          this.clearScene();
          this.possessionTextStatus = (this.offense) ? 'Attacking' : 'Defending';
          this.createWorld();
          setTimeout(() => {
            this.possessionChange = true;
            this.turnover = false;
            this.possessionCountDown.reset();
            this.possessionCountDown.start(()=>{
              this.handlePossessionChange();
            })
          });
        }
      }
      
      this.doConeLogic();
      this.doExplosionLogic();
      this.render();
    requestAnimationFrame(this.update.bind(this));//request next update
  }
  doConeLogic(){
    var oneTree;
    var treePos = new THREE.Vector3();
    var conesToRemove=[];
    this.conesInPath.forEach( ( element, index ) => {
      oneTree= this.conesInPath[ index ];
      treePos.setFromMatrixPosition( oneTree.matrixWorld );
      if(treePos.z>8 && oneTree.visible){//gone out of our view zone
        //conesToRemove.push(oneTree);
      }else{//check collision
        if(treePos.distanceTo(this.heroSphere.position)<=0.7 && oneTree.visible){
          console.log("hit");
          oneTree.visible=false;
          this.hasCollided=true;
          this.explode();
        }
      }
    });
    var fromWhere;
    conesToRemove.forEach( ( element, index ) => {
      oneTree=conesToRemove[ index ];
      fromWhere=this.conesInPath.indexOf(oneTree);
      this.conesInPath.splice(fromWhere,1);
      this.conesPool.push(oneTree);
      //oneTree.visible=false;
      console.log("remove tree");
    });
  }
  doExplosionLogic(){
    if(!this.particles.visible)return;
    for (var i = 0; i < this.particleCount; i ++ ) {
      this.particleGeometry.vertices[i].multiplyScalar(this.explosionPower);
    }
    if(this.explosionPower>1.005){
      this.explosionPower-=0.001;
    }else{
      this.particles.visible=false;
    }
    this.particleGeometry.verticesNeedUpdate = true;
  }
  explode(){
    this.particles.position.y=2;
    this.particles.position.z=4.8;
    this.particles.position.x=this.heroSphere.position.x;
    for (var i = 0; i < this.particleCount; i ++ ) {
      var vertex = new THREE.Vector3();
      vertex.x = -0.2+Math.random() * 0.4;
      vertex.y = -0.2+Math.random() * 0.4 ;
      vertex.z = -0.2+Math.random() * 0.4;
      this.particleGeometry.vertices[i]=vertex;
    }
    this.explosionPower=1.07;
    this.particles.visible=true;
  }
  defenseLayout(placement: number) {
    if(this.currentShots > 0) {
      this.currentShots--;
      this.addCone(true,placement,false);
    } else {
      this.timeLimitReached = true;
    }
  }
  render(){
    this.renderer.render(this.scene, this.camera);//draw
  }
  handlePossessionChange() {
    this.goText = true;
    this.possessionChange = false;
    this.countUp.pauseResume();
    setTimeout(() => {
      this.goText = false;
      this.timerRunning = true;
    }, 1000);
  }
  handleGoalTimer() {
    this.goalTimeUp = true;
    this.runGoalLogic();
  }
  runGoalLogic() {
    this.offense = !this.offense;
    this.clearScene();
    this.possessionTextStatus = (this.offense) ? 'Attacking' : 'Defending';
    this.createWorld();
    this.timerRunning = false;
    this.goalShot = false;
    this.goalMiniGame = false;      
    this.goalStatus = '';
    this.meterStop = false;
    this.goalMeter = false;
    this.goalKeeper = false;
    this.goalLinedUp = false;
    this.rotationStop = false;
    this.turnover = true;
    this.goalCountdown.reset();
    this.goalTimeUp = false;
    this.turnover = false;
    this.timerRunning = true;
    this.goaltimerVisible = false;
    this.countUp.reset();
    this.countUp.pauseResume();
  }
  gameOver() {
    //cancelAnimationFrame( globalRenderID );
    //window.clearInterval( powerupSpawnIntervalID );
  }
  onWindowResize() {
    //resize & align
    this.sceneHeight = window.innerHeight;
    this.sceneWidth = window.innerWidth;
    //renderer.setSize(sceneWidth, sceneHeight);
    this.camera.aspect = this.sceneWidth/this.sceneHeight;
    this.camera.updateProjectionMatrix();
  }

}
