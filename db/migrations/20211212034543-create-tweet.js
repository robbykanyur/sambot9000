'use strict';

const { DataTypes } = require("sequelize/dist");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Tweets', {
      id: {
        autoIncrement: true,
        primaryKey: true,
        unique: true,
        type: DataTypes.INTEGER
      },
      tweetID: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },
      text: {
        type: Sequelize.STRING(512)
      },
      tweetedAt: {
        type: Sequelize.DATE
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Tweets');
  }
};