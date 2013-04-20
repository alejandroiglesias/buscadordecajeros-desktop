#!/usr/bin/python
import shutil, os

out_filename = 'main.min.js'
js_files = [
	'vendor/overthrow.js',
	'helper.js',
	'main.js',
]

# Check if temp file exists and remove it
if(os.path.exists(out_filename)):
	print '* Removing old output file '+out_filename
	os.unlink(out_filename)

# Loop into files and merge them in the temporary file
print '* Bundling files'
for f in js_files:
	print f
	os.system('yui-compressor --type js '+f+' >> '+out_filename)
