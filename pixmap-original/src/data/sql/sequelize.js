/**
 *
 */

import Sequelize from 'sequelize';

import logger from '../../core/logger';
import {
  MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER, MYSQL_PW, LOG_MYSQL,
} from '../../core/config';

const sequelize = new Sequelize(MYSQL_DATABASE, MYSQL_USER, MYSQL_PW, {
  host: MYSQL_HOST,
  dialect: 'postgres',
  pool: {
    min: 2,
    max: 10,
    idle: 10000,
    acquire: 10000,
  },
  logging: (LOG_MYSQL) ? (...msg) => logger.info(msg) : false,
  dialectOptions: {
    connectTimeout: 10000,
  },
});

export default sequelize;
