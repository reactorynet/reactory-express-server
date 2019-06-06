pipeline {
  agent any
  stages {
    stage('Clean') {
      steps {
        dir: ('/data/builds/reactory-api') {
          // a block
        }
      }
    }
    stage('Build') {
      steps {
        sh 'npm install'
      }
    }
  }
}