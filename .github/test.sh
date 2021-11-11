
baseversion="0.0.1"
version="0.0.1-thing.1"
branch="thing"
echo "${version%.*}"
if [[ $version =~ $branch ]]
then
    basev="${version%.*}"
    dotv="${version##*.}"
    echo "${basev}.$((dotv + 1))"
else
    echo "${baseversion}-${branch}.1"
fi
# foo="0.0.2-this.1"
# bar="${foo##*.}"
# thing="0.0.2-this.$((bar + 1))"
# echo $thing