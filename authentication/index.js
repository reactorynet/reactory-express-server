import passport from 'passport';
import LocalStrategy from 'passport-local';



class AuthConfig {

    static Configure = (app) => {
        passport.initialize();
        passport.use(new LocalStrategy(AuthConfig.BasicAuth));
    }

    static BasicAuth = ( username, password, done ) => { 
        
    };
}

export default AuthConfig;