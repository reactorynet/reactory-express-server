pipeline {
  agent any
  stages {
    stage('Clean') {
      steps {
        ws(dir: '/data/builds/reactory-api')
      }
    }
    stage('Build') {
      steps {
        sh 'npm install'
      }
    }
  }
}