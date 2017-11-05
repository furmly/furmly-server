echo backing up %*
if [[ -z "${MONGO_HOME}" ]]; then
  _MONGO_HOME="/c/program files/MongoDB/Server/3.4/bin"
else
  _MONGO_HOME="${MONGO_HOME}"
fi
for var in "$@"
do
     "${_MONGO_HOME}/mongodump.exe" --db $var --out "./db_$var"
done

