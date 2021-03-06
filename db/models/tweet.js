'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Tweet extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  Tweet.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tweetID: {
      type: DataTypes.STRING(512),
      allowNull: false,
      unique: true
    },
    text: DataTypes.STRING,
    tweetedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Tweet',
  });
  return Tweet;
};