import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

const ListHeading = ({title, buttonText}: ListHeadingProps) => {
  return (
    <View className='list-head'>
      <Text className='list-title'>{title}</Text>

      <TouchableOpacity className='list-action'>
        <Text className='list-action-text'>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  )
}

export default ListHeading