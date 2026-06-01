/*
 *
 * Database layout for Chat Message History
 *
 */

import { DataTypes } from 'sequelize';
import sequelize from './sequelize';
import Channel from './Channel';
import RegUser from './RegUser';

const Message = sequelize.define('Message', {
  // Message ID
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  name: {
    type: DataTypes.CHAR(32),
    defaultValue: 'mx',
    allowNull: false,
  },

  flag: {
    type: DataTypes.CHAR(2),
    defaultValue: 'xx',
    allowNull: false,
  },

  message: {
    type: DataTypes.CHAR(200),
    allowNull: false,
  },
}, {
  updatedAt: false,

  setterMethods: {
    message(value) {
      this.setDataValue('message', value.slice(0, 200));
    },
  },
});

Message.belongsTo(Channel, {
  as: 'channel',
  foreignKey: 'cid',
  onDelete: 'cascade',
});

Message.belongsTo(RegUser, {
  as: 'user',
  foreignKey: 'uid',
  onDelete: 'cascade',
});

export default Message;
