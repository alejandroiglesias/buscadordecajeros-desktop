#!/bin/bash

function realpath_f () {(cd "$1" && echo "$(pwd -P)")}

basedir="$( realpath_f `dirname ${0}` )";
basedir="$( dirname `dirname ${basedir}` )";

MACDIR="${basedir}/package/mac";
TARDIR="${MACDIR}/dist"

if [ -d ${TARDIR} ]; then
  echo "Error: ${TARDIR} exists.";
  exit 1;
fi;

mkdir -p ${TARDIR};
cp -Rpa ${MACDIR}/AppBundle.skel.app ${TARDIR}/Buscador_de_Cajeros.app;
cp -Rpa ${basedir}/data/bin/* ${TARDIR}/Buscador_de_Cajeros.app/Contents/MacOS/bin/;
cp -Rpa ${basedir}/data/node_modules ${TARDIR}/Buscador_de_Cajeros.app/Contents/MacOS/;
cp -Rpa ${basedir}/data/content ${TARDIR}/Buscador_de_Cajeros.app/Contents/Resources/;
cp -Rpa ${basedir}/data/app.js ${TARDIR}/Buscador_de_Cajeros.app/Contents/Resources/;
open ${TARDIR}/Buscador_de_Cajeros.app;
