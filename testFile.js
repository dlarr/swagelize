[{
    model: 'Pet',
    modelContent: 'module.exports = function(sequelize, DataTypes) {\n\tvar Pet = sequelize.define(\'Pet\', { id: \n   { type: DataTypes.BIGINT,\n     format: \'int64\',\n     allowNull: false,\n     primaryKey: true,\n     autoIncrement: true },\n  name: \n   { t
    ype: DataTypes.STRING,\n
example: \
'doggie\',\n     allowNull: true },\n  status: \n   { type: DataTypes.ENUM(\'available\', \'pending\', \'sold\'),\n     description: \'pet status in the store\',\n     allowNull: true },\n  id_category: \n   { type: DataTypes
    .BIGINT,\n
allowNull: false,\n
references: {
    model: \
    'Category\', key: \'id\' } } }, {\n\t\ttableName: \'Pet\',\n\t\ttimestamps: false\n\t});\n'
}
,
modelContent: 'undefined\n\n\treturn Pet;\n};'
]
