import mongoose from 'mongoose';
import time from './time';
import meta from './meta';

mongoose.plugin(time);
mongoose.plugin(meta);